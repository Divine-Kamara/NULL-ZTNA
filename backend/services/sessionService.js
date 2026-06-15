const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_sign_key_change_in_production';
const SESSION_TTL_SECONDS = 3600; // 1 Hour session lifetime

/**
 * Generate a JWT and write a session row to the database.
 */
const generateSession = async (user, deviceId = null) => {
  const expiryTime = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  
  // Create JWT payload
  const payload = {
    user_id: user.user_id,
    email: user.email,
    role_id: user.role_id,
    role_name: user.role_name,
    device_id: deviceId
  };

  // Sign Token
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: SESSION_TTL_SECONDS });

  // Store in database
  const session = await db.createSession(user.user_id, token, expiryTime);

  return {
    token,
    expiry_time: expiryTime,
    session_id: session.session_id
  };
};

/**
 * Validates token signature, expiration, and database status.
 */
const validateSession = async (token) => {
  try {
    // 1. Verify JWT signature & expiration
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 2. Check session row in database
    const dbSession = await db.getSessionByToken(token);
    if (!dbSession) {
      return { valid: false, reason: 'Session not found in records' };
    }

    if (dbSession.status !== 'active') {
      return { valid: false, reason: `Session status is '${dbSession.status}'` };
    }

    if (new Date() > new Date(dbSession.expiry_time)) {
      // Mark as expired in DB
      await db.updateSessionStatus(dbSession.session_id, 'expired');
      return { valid: false, reason: 'Session has expired' };
    }

    return {
      valid: true,
      decoded,
      dbSession
    };
  } catch (err) {
    // If it's a token expiration error, try to invalidate session in DB
    if (err.name === 'TokenExpiredError') {
      try {
        const dbSession = await db.getSessionByToken(token);
        if (dbSession && dbSession.status === 'active') {
          await db.updateSessionStatus(dbSession.session_id, 'expired');
        }
      } catch (dbErr) {
        console.error('Failed to mark expired session in DB:', dbErr.message);
      }
    }
    return { valid: false, reason: err.message };
  }
};

/**
 * Terminate a session.
 */
const terminateSession = async (sessionId) => {
  return await db.updateSessionStatus(sessionId, 'terminated');
};

/**
 * Terminate a session by token value.
 */
const terminateSessionByToken = async (token) => {
  const dbSession = await db.getSessionByToken(token);
  if (dbSession) {
    return await db.updateSessionStatus(dbSession.session_id, 'terminated');
  }
  return null;
};

module.exports = {
  generateSession,
  validateSession,
  terminateSession,
  terminateSessionByToken,
  SESSION_TTL_SECONDS
};
