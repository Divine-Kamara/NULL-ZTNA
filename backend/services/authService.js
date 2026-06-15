const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const auditService = require('./auditService');
const sessionService = require('./sessionService');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_sign_key_change_in_production';

/**
 * Register a new user with email and password. Default role is Guest.
 */
const registerUser = async (fullName, email, password) => {
  const existingUser = await db.getUserByEmail(email);
  if (existingUser) {
    throw new Error('Email already registered');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);
  
  // Default role is Guest (role_id = 3)
  const user = await db.createUser(fullName, email, passwordHash, 3);
  
  // Return user without sensitive data
  const { password_hash, totp_secret, ...safeUser } = user;
  return safeUser;
};

/**
 * Helper to execute the device check pipeline.
 */
const checkDeviceStatus = async (userId, fingerprint, deviceName, ipAddress) => {
  if (!fingerprint) {
    throw new Error('Device fingerprint is required');
  }

  const user = await db.getUserById(userId);
  const userDevices = await db.getUserDevices(userId);
  const hasTrustedDevice = userDevices.some(d => d.trust_status === 'trusted');

  let device = await db.getDeviceByFingerprint(fingerprint);

  // Bootstrap rule: If the user is an Administrator and has no trusted devices yet,
  // we automatically trust the first device they register/use.
  const isBootstrapAdmin = user && user.role_name === 'Administrator' && !hasTrustedDevice;

  if (!device) {
    const initialStatus = isBootstrapAdmin ? 'trusted' : 'pending';
    device = await db.createDevice(userId, deviceName || 'Unknown Device', fingerprint, initialStatus);
    
    if (initialStatus === 'trusted') {
      await auditService.logActivity(userId, 'DEVICE_TRUSTED_BOOTSTRAP', ipAddress);
    } else {
      await auditService.logActivity(userId, 'DEVICE_UNRECOGNIZED', ipAddress);
      return {
        status: 'pending',
        device_id: device.device_id,
        allowed: false,
        message: 'Device verification failed: device is unregistered. An administrator must trust this device.'
      };
    }
  } else {
    // Verify device ownership: device must belong to the current user
    if (device.user_id !== userId) {
      await auditService.logActivity(userId, 'DEVICE_SHARING_BLOCKED', ipAddress);
      return {
        status: 'unauthorized',
        device_id: device.device_id,
        allowed: false,
        message: 'Device verification failed: device fingerprint is registered to another user.'
      };
    }

    if (device.trust_status === 'pending' && isBootstrapAdmin) {
      // If the device was previously registered as pending, auto-trust it during admin bootstrap
      device = await db.updateDeviceTrust(device.device_id, 'trusted');
      await auditService.logActivity(userId, 'DEVICE_TRUSTED_BOOTSTRAP', ipAddress);
    }
  }

  if (device.trust_status === 'revoked') {
    await auditService.logActivity(userId, 'DEVICE_REVOKED', ipAddress);
    return {
      status: 'revoked',
      device_id: device.device_id,
      allowed: false,
      message: 'Device verification failed: device trust has been revoked.'
    };
  }

  if (device.trust_status === 'pending') {
    await auditService.logActivity(userId, 'DEVICE_PENDING', ipAddress);
    return {
      status: 'pending',
      device_id: device.device_id,
      allowed: false,
      message: 'Device verification failed: device is pending administrator approval.'
    };
  }

  // Trusted device
  return {
    status: 'trusted',
    device_id: device.device_id,
    allowed: true
  };
};

/**
 * Handle Phase 1 Login Flow: password check and 2FA determination.
 */
const loginUser = async (email, password, fingerprint, deviceName, ipAddress) => {
  const user = await db.getUserByEmail(email);
  if (!user) {
    await auditService.logActivity(null, 'LOGIN_FAIL_UNKNOWN_USER', ipAddress);
    throw new Error('Invalid email or password');
  }

  if (user.status === 'disabled') {
    await auditService.logActivity(user.user_id, 'LOGIN_FAIL_USER_DISABLED', ipAddress);
    throw new Error('User account is disabled');
  }

  // Check password
  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatch) {
    await auditService.logActivity(user.user_id, 'LOGIN_FAIL_PASSWORD', ipAddress);
    throw new Error('Invalid email or password');
  }

  // If TOTP is enabled, return requirement for TOTP with temporary token
  if (user.totp_enabled) {
    const tempToken = jwt.sign(
      { 
        user_id: user.user_id, 
        fingerprint, 
        deviceName,
        temp: true 
      }, 
      JWT_SECRET, 
      { expiresIn: '5m' } // 5 minutes validity
    );
    
    return {
      requires_totp: true,
      temp_token: tempToken
    };
  }

  // If TOTP is not enabled, proceed to device check
  const deviceCheck = await checkDeviceStatus(user.user_id, fingerprint, deviceName, ipAddress);
  if (!deviceCheck.allowed) {
    return {
      blocked: true,
      reason: deviceCheck.status,
      message: deviceCheck.message
    };
  }

  // Success: generate full session JWT
  const session = await sessionService.generateSession(user, deviceCheck.device_id);
  await auditService.logActivity(user.user_id, 'LOGIN_SUCCESS', ipAddress);

  const { password_hash, totp_secret, ...safeUser } = user;
  return {
    token: session.token,
    user: safeUser
  };
};

module.exports = {
  registerUser,
  loginUser,
  checkDeviceStatus
};
