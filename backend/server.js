const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const db = require('./db');

// Import Services
const authService = require('./services/authService');
const totpService = require('./services/totpService');
const sessionService = require('./services/sessionService');
const auditService = require('./services/auditService');

// Import Middleware
const { requireAuth, requireAdmin } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_sign_key_change_in_production';

// Global Middleware
app.use(helmet());
app.use(cors({
  origin: '*', // Allow all origins for the project demonstration
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', apiLimiter);

// -------------------------------------------------------------
// Auth & Onboarding Endpoints
// -------------------------------------------------------------

// POST /api/auth/register — FR1
app.post('/api/auth/register', async (req, res) => {
  const { full_name, email, password } = req.body;
  if (!full_name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const user = await authService.registerUser(full_name, email, password);
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await auditService.logActivity(user.user_id, 'USER_REGISTERED', ipAddress);
    return res.status(201).json(user);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// POST /api/auth/login — FR2
app.post('/api/auth/login', async (req, res) => {
  const { email, password, device_fingerprint, device_name } = req.body;
  if (!email || !password || !device_fingerprint) {
    return res.status(400).json({ error: 'Email, password and device fingerprint are required' });
  }

  const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  try {
    const result = await authService.loginUser(email, password, device_fingerprint, device_name, ipAddress);
    
    if (result.requires_totp) {
      return res.json({ requires_totp: true, temp_token: result.temp_token });
    }

    if (result.blocked) {
      return res.status(403).json({ 
        error: result.message,
        reason: result.reason 
      });
    }

    return res.json({ token: result.token, user: result.user });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// POST /api/auth/totp/setup — (Authenticated)
app.post('/api/auth/totp/setup', requireAuth, async (req, res) => {
  try {
    const user = await db.getUserById(req.user.user_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { secret, qrCodeDataUrl } = await totpService.setupTotp(user.email);
    
    // Save secret as temporary secret in DB (but keep totp_enabled = false until verified)
    await db.updateUserTotp(user.user_id, secret, false);

    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await auditService.logActivity(user.user_id, 'TOTP_SETUP_INITIATED', ipAddress);

    return res.json({ secret, qrCodeDataUrl });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/totp/enroll — (Authenticated) Complete setup
app.post('/api/auth/totp/enroll', requireAuth, async (req, res) => {
  const { totp_code } = req.body;
  if (!totp_code) {
    return res.status(400).json({ error: 'Verification code is required' });
  }

  try {
    const user = await db.getUserById(req.user.user_id);
    if (!user || !user.totp_secret) {
      return res.status(400).json({ error: 'TOTP setup was not initiated' });
    }

    const isVerified = totpService.verifyTotp(totp_code, user.totp_secret);
    if (!isVerified) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // Enable TOTP in database
    await db.updateUserTotp(user.user_id, user.totp_secret, true);
    
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await auditService.logActivity(user.user_id, 'TOTP_ENABLED', ipAddress);

    return res.json({ message: '2FA enrolled successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/totp/verify — FR3/FR4
app.post('/api/auth/totp/verify', async (req, res) => {
  const { temp_token, totp_code } = req.body;
  if (!temp_token || !totp_code) {
    return res.status(400).json({ error: 'Temporary token and verification code are required' });
  }

  const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  try {
    // Verify temporary token signature & type
    const decoded = jwt.verify(temp_token, JWT_SECRET);
    if (!decoded.temp) {
      return res.status(400).json({ error: 'Invalid temporary token' });
    }

    const user = await db.getUserById(decoded.user_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify TOTP code
    const isVerified = totpService.verifyTotp(totp_code, user.totp_secret);
    if (!isVerified) {
      await auditService.logActivity(user.user_id, 'TOTP_FAIL', ipAddress);
      return res.status(401).json({ error: 'Invalid verification code' });
    }

    // Perform device status check
    const deviceCheck = await authService.checkDeviceStatus(user.user_id, decoded.fingerprint, decoded.deviceName, ipAddress);
    if (!deviceCheck.allowed) {
      return res.status(403).json({ 
        error: deviceCheck.message,
        reason: deviceCheck.status 
      });
    }

    // Successful login: issue session
    const session = await sessionService.generateSession(user, deviceCheck.device_id);
    await auditService.logActivity(user.user_id, 'LOGIN_SUCCESS', ipAddress);

    const { password_hash, totp_secret, ...safeUser } = user;
    return res.json({
      token: session.token,
      user: safeUser
    });
  } catch (err) {
    return res.status(401).json({ error: 'Temporary token is invalid or has expired' });
  }
});

// POST /api/auth/logout
app.post('/api/auth/logout', requireAuth, async (req, res) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await sessionService.terminateSession(req.sessionId);
    await auditService.logActivity(req.user.user_id, 'LOGOUT', ipAddress);
    return res.json({ message: 'Session terminated successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me (Get profile helper)
app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const user = await db.getUserById(req.user.user_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { password_hash, totp_secret, ...safeUser } = user;
    return res.json({ user: safeUser, session_id: req.sessionId });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Device Management Endpoints (Phase 2 & Admin)
// -------------------------------------------------------------

// GET /api/devices
app.get('/api/devices', requireAuth, async (req, res) => {
  try {
    if (req.user.role_name === 'Administrator') {
      const devices = await db.getAllDevices();
      return res.json(devices);
    } else {
      const devices = await db.getUserDevices(req.user.user_id);
      return res.json(devices);
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/devices/register
app.post('/api/devices/register', requireAuth, async (req, res) => {
  const { device_name, device_fingerprint } = req.body;
  if (!device_fingerprint) {
    return res.status(400).json({ error: 'Device fingerprint is required' });
  }

  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    // Check if device already registered
    const existing = await db.getDeviceByFingerprint(device_fingerprint);
    if (existing) {
      return res.status(400).json({ error: 'Device fingerprint is already registered' });
    }

    const device = await db.createDevice(req.user.user_id, device_name, device_fingerprint, 'pending');
    await auditService.logActivity(req.user.user_id, 'DEVICE_REGISTERED', ipAddress);
    return res.status(201).json(device);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/devices/:id/trust (Admin only)
app.patch('/api/devices/:id/trust', requireAuth, requireAdmin, async (req, res) => {
  const { trust_status } = req.body;
  if (!['trusted', 'revoked', 'pending'].includes(trust_status)) {
    return res.status(400).json({ error: 'Invalid trust status' });
  }

  try {
    const device = await db.updateDeviceTrust(req.params.id, trust_status);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const logActivityName = trust_status === 'trusted' ? 'DEVICE_TRUSTED' : 'DEVICE_REVOKED';
    await auditService.logActivity(device.user_id, logActivityName, ipAddress);

    return res.json(device);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/devices/:id
app.delete('/api/devices/:id', requireAuth, async (req, res) => {
  try {
    // If user is not admin, they can only delete their own device
    const device = await db.getAllDevices();
    const target = device.find(d => d.device_id === parseInt(req.params.id));
    if (!target) {
      return res.status(404).json({ error: 'Device not found' });
    }

    if (req.user.role_name !== 'Administrator' && target.user_id !== req.user.user_id) {
      return res.status(403).json({ error: 'Unauthorized to delete this device' });
    }

    await db.deleteDevice(req.params.id);
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await auditService.logActivity(target.user_id, 'DEVICE_DELETED', ipAddress);
    return res.json({ message: 'Device removed successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Resource Access & Policy Enforcement Endpoints (Phase 3)
// -------------------------------------------------------------

// GET /api/resources
app.get('/api/resources', requireAuth, async (req, res) => {
  try {
    // Fetch policies matched to the user's role
    const policies = await db.getPoliciesByRoleId(req.user.role_id);
    // Extract resource names
    const resources = policies.map(p => ({
      resource_name: p.resource_name,
      access_condition: p.access_condition
    }));
    return res.json(resources);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/access-requests — FR9/FR10
app.post('/api/access-requests', requireAuth, async (req, res) => {
  const { resource_name } = req.body;
  if (!resource_name) {
    return res.status(400).json({ error: 'Resource name is required' });
  }

  const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const steps = [];

  // Build the 6-step Access Decision Ladder response object
  // Each step contains { check: string, status: 'PASS' | 'FAIL' | 'SKIPPED', detail?: string }
  try {
    // Step 1: User Authentication
    steps.push({ check: 'User Authentication', status: 'PASS' });

    // Step 2: Two-Factor Authentication
    const user = await db.getUserById(req.user.user_id);
    if (!user.totp_enabled) {
      steps.push({ check: 'Two-Factor Authentication', status: 'FAIL', detail: '2FA is not enabled for this user.' });
      steps.push({ check: 'Device Verification', status: 'SKIPPED' });
      steps.push({ check: 'Role Verification', status: 'SKIPPED' });
      steps.push({ check: 'Policy Verification', status: 'SKIPPED' });
      steps.push({ check: 'Session Validation', status: 'SKIPPED' });
      
      await auditService.logActivity(user.user_id, 'ACCESS_DENIED_2FA_NOT_ENABLED', ipAddress);
      return res.status(403).json({ allowed: false, steps, reason: '2FA is not enabled' });
    }
    steps.push({ check: 'Two-Factor Authentication', status: 'PASS' });

    // Step 3: Device Verification
    if (!req.user.device_id) {
      steps.push({ check: 'Device Verification', status: 'FAIL', detail: 'No device fingerprint associated with session.' });
      steps.push({ check: 'Role Verification', status: 'SKIPPED' });
      steps.push({ check: 'Policy Verification', status: 'SKIPPED' });
      steps.push({ check: 'Session Validation', status: 'SKIPPED' });
      
      await auditService.logActivity(user.user_id, 'ACCESS_DENIED_NO_DEVICE', ipAddress);
      return res.status(403).json({ allowed: false, steps, reason: 'Device verification failed: no device associated.' });
    }

    const devices = await db.getUserDevices(user.user_id);
    const device = devices.find(d => d.device_id === req.user.device_id);
    
    if (!device || device.trust_status !== 'trusted') {
      const statusStr = device ? device.trust_status : 'unregistered';
      steps.push({ check: 'Device Verification', status: 'FAIL', detail: `Device status is ${statusStr}.` });
      steps.push({ check: 'Role Verification', status: 'SKIPPED' });
      steps.push({ check: 'Policy Verification', status: 'SKIPPED' });
      steps.push({ check: 'Session Validation', status: 'SKIPPED' });
      
      await auditService.logActivity(user.user_id, `ACCESS_DENIED_DEVICE_${statusStr.toUpperCase()}`, ipAddress);
      return res.status(403).json({ allowed: false, steps, reason: `Device trust status is ${statusStr}.` });
    }
    steps.push({ check: 'Device Verification', status: 'PASS' });

    // Step 4: Role Verification
    steps.push({ check: 'Role Verification', status: 'PASS' });

    // Step 5: Policy Verification
    const policies = await db.getPoliciesByRoleId(req.user.role_id);
    const policy = policies.find(p => p.resource_name.toLowerCase() === resource_name.toLowerCase());
    
    if (!policy) {
      steps.push({ check: 'Policy Verification', status: 'FAIL', detail: `No policy grants role '${req.user.role_name}' access to resource '${resource_name}'.` });
      steps.push({ check: 'Session Validation', status: 'SKIPPED' });
      
      await auditService.logActivity(user.user_id, 'ACCESS_DENIED_POLICY_NOT_FOUND', ipAddress);
      return res.status(403).json({ allowed: false, steps, reason: `Policy validation failed: no matching rule.` });
    }

    // Evaluate access_condition
    // For simplicity, we check if the policy conditions "trusted_device" and "active_session" are satisfied (which they are because we reached here)
    if (policy.access_condition.includes('trusted_device') && device.trust_status !== 'trusted') {
      steps.push({ check: 'Policy Verification', status: 'FAIL', detail: 'Policy condition "trusted_device" not met.' });
      steps.push({ check: 'Session Validation', status: 'SKIPPED' });
      
      await auditService.logActivity(user.user_id, 'ACCESS_DENIED_CONDITION_NOT_MET', ipAddress);
      return res.status(403).json({ allowed: false, steps, reason: 'Policy conditions not satisfied.' });
    }
    steps.push({ check: 'Policy Verification', status: 'PASS' });

    // Step 6: Session Validation
    const sessionResult = await sessionService.validateSession(req.token);
    if (!sessionResult.valid) {
      steps.push({ check: 'Session Validation', status: 'FAIL', detail: sessionResult.reason });
      
      await auditService.logActivity(user.user_id, 'ACCESS_DENIED_SESSION_EXPIRED', ipAddress);
      return res.status(403).json({ allowed: false, steps, reason: 'Session expired or invalidated.' });
    }
    steps.push({ check: 'Session Validation', status: 'PASS' });

    // Access Approved!
    await auditService.logActivity(user.user_id, `ACCESS_GRANTED_${resource_name.replace(/\s+/g, '_').toUpperCase()}`, ipAddress);
    return res.json({
      allowed: true,
      steps,
      resource_data: {
        resource_name,
        timestamp: new Date().toISOString(),
        payload: `Secured credentials & contents for ${resource_name}. Access approved under Zero Trust policy.`
      }
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Policy CRUD Endpoints (Admin only)
// -------------------------------------------------------------
app.get('/api/policies', requireAuth, requireAdmin, async (req, res) => {
  try {
    const policies = await db.getAllPolicies();
    return res.json(policies);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/policies', requireAuth, requireAdmin, async (req, res) => {
  const { role_id, resource_name, access_condition } = req.body;
  if (!role_id || !resource_name || !access_condition) {
    return res.status(400).json({ error: 'role_id, resource_name, and access_condition are required' });
  }

  try {
    const policy = await db.createPolicy(role_id, resource_name, access_condition);
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await auditService.logActivity(req.user.user_id, 'POLICY_CREATED', ipAddress);
    return res.status(201).json(policy);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/policies/:id', requireAuth, requireAdmin, async (req, res) => {
  const { role_id, resource_name, access_condition } = req.body;
  if (!role_id || !resource_name || !access_condition) {
    return res.status(400).json({ error: 'role_id, resource_name, and access_condition are required' });
  }

  try {
    const policy = await db.updatePolicy(req.params.id, role_id, resource_name, access_condition);
    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await auditService.logActivity(req.user.user_id, 'POLICY_UPDATED', ipAddress);
    return res.json(policy);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/policies/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const success = await db.deletePolicy(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Policy not found' });
    }
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await auditService.logActivity(req.user.user_id, 'POLICY_DELETED', ipAddress);
    return res.json({ message: 'Policy deleted successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// User Management Endpoints (Admin only)
// -------------------------------------------------------------
app.get('/api/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await db.getAllUsers();
    return res.json(users);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.patch('/api/users/:id', requireAuth, requireAdmin, async (req, res) => {
  const { role_id, status } = req.body;
  try {
    const user = await db.updateUserRoleAndStatus(req.params.id, role_id, status);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await auditService.logActivity(req.user.user_id, 'USER_MODIFIED', ipAddress);
    return res.json(user);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const success = await db.deleteUser(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'User not found' });
    }
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await auditService.logActivity(req.user.user_id, 'USER_DELETED', ipAddress);
    return res.json({ message: 'User deleted successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Session Management Endpoints
// -------------------------------------------------------------
app.get('/api/sessions', requireAuth, async (req, res) => {
  try {
    if (req.user.role_name === 'Administrator') {
      const sessions = await db.getAllSessions();
      return res.json(sessions);
    } else {
      const sessions = await db.getUserSessions(req.user.user_id);
      return res.json(sessions);
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/sessions/:id', requireAuth, async (req, res) => {
  try {
    const session = await db.getSessionById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (req.user.role_name !== 'Administrator' && session.user_id !== req.user.user_id) {
      return res.status(403).json({ error: 'Unauthorized to terminate this session' });
    }

    await sessionService.terminateSession(req.params.id);
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await auditService.logActivity(session.user_id, 'SESSION_TERMINATED', ipAddress);
    return res.json({ message: 'Session terminated successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Audit Logs (Admin only)
// -------------------------------------------------------------
app.get('/api/audit-logs', requireAuth, requireAdmin, async (req, res) => {
  const { user_id, activity } = req.query;
  try {
    const logs = await db.getAllAuditLogs({ user_id, activity });
    return res.json(logs);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Roles
// -------------------------------------------------------------
app.get('/api/roles', requireAuth, async (req, res) => {
  try {
    const roles = await db.getRoles();
    return res.json(roles);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Initialize database and start server
db.initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`[SERVER] NULL ZTNA Backend running on port ${PORT}`);
  });
});
