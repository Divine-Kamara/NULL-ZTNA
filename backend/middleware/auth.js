const sessionService = require('../services/sessionService');
const auditService = require('../services/auditService');

/**
 * Middleware to require a valid session (JWT + active DB status)
 */
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const token = authHeader.split(' ')[1];
  const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  const result = await sessionService.validateSession(token);
  if (!result.valid) {
    // Write warning audit log if user_id is decoded
    const userId = result.decoded ? result.decoded.user_id : null;
    await auditService.logActivity(userId, 'SESSION_INVALID', ipAddress);
    return res.status(401).json({ error: `Unauthorized: ${result.reason}` });
  }

  // Attach user identity to request object
  req.user = result.decoded;
  req.token = token;
  req.sessionId = result.dbSession.session_id;
  next();
};

/**
 * Middleware to require Administrator privilege
 */
const requireAdmin = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role_name !== 'Administrator') {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await auditService.logActivity(req.user.user_id, 'ACCESS_DENIED_UNAUTHORIZED_ROLE', ipAddress);
    return res.status(403).json({ error: 'Access denied: Administrator privileges required.' });
  }

  next();
};

module.exports = {
  requireAuth,
  requireAdmin
};
