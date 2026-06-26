const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '../.env' }); // Load from root .env

let pool = null;
let useMock = false;

// Mock database tables
const mockDb = {
  roles: [
    { role_id: 1, role_name: 'Administrator', permissions: { all: true } },
    { role_id: 2, role_name: 'Employee', permissions: { read_resources: true } },
    { role_id: 3, role_name: 'Guest', permissions: { read_guest_resources: true } }
  ],
  users: [],
  devices: [],
  policies: [
    { policy_id: 1, role_id: 1, resource_name: 'Admin Console', access_condition: 'trusted_device AND active_session' },
    { policy_id: 2, role_id: 2, resource_name: 'HR Portal', access_condition: 'trusted_device AND active_session' },
    { policy_id: 3, role_id: 3, resource_name: 'Public Portal', access_condition: 'active_session' }
  ],
  sessions: [],
  audit_logs: [],
  student_transcripts: [
    {
      student_id: "STU2023001", student_name: "Amara Diallo", programme: "BSc Computer Science", academic_year: "Year 2",
      courses: [
        { code: "CSCI101", name: "Introduction to Programming", credits: 3, grade: "A" },
        { code: "MATH101", name: "Calculus I", credits: 3, grade: "B" },
        { code: "CSCI102", name: "Data Structures", credits: 3, grade: "A" },
        { code: "ENGL101", name: "Communication Skills", credits: 2, grade: "B" }
      ]
    },
    {
      student_id: "STU2023002", student_name: "Ngozi Okafor", programme: "BSc Cybersecurity", academic_year: "Year 2",
      courses: [
        { code: "CSCI101", name: "Introduction to Programming", credits: 3, grade: "B" },
        { code: "MATH101", name: "Calculus I", credits: 3, grade: "C" },
        { code: "SECU101", name: "Network Security Fundamentals", credits: 3, grade: "A" },
        { code: "ENGL101", name: "Communication Skills", credits: 2, grade: "A" }
      ]
    },
    {
      student_id: "STU2023003", student_name: "Kwame Mensah", programme: "BSc Information Systems", academic_year: "Year 1",
      courses: [
        { code: "CSCI101", name: "Introduction to Programming", credits: 3, grade: "C" },
        { code: "MATH101", name: "Calculus I", credits: 3, grade: "B" },
        { code: "ENGL101", name: "Communication Skills", credits: 2, grade: "B" }
      ]
    }
  ]
};

// Seed Administrator in mock DB
const seedMockAdmin = async () => {
  const adminName = process.env.ADMIN_NAME || 'System Administrator';
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@null.local';
  const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPass123!';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  
  mockDb.users.push({
    user_id: 1,
    full_name: adminName,
    email: adminEmail,
    password_hash: hashedPassword,
    totp_secret: null,
    totp_enabled: false,
    role_id: 1, // Administrator
    status: 'active',
    created_at: new Date()
  });
};

// Initialize DB Connection
const initDb = async () => {
  const connectionConfig = process.env.DATABASE_URL
    ? { 
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'null_ztna',
      };

  pool = new Pool({
    ...connectionConfig,
    connectionTimeoutMillis: 10000 // Increased timeout for serverless database cold starts (like Neon)
  });

  try {
    // Attempt simple query
    await pool.query('SELECT 1');
    console.log('\x1b[32m%s\x1b[0m', '[DATABASE] Connected to PostgreSQL successfully.');
    
    // Seed Administrator and Policies if missing in Postgres
    await seedPostgresAdmin();
    await seedPostgresPolicies();
    await seedPostgresTranscripts();
  } catch (err) {
    console.warn('\x1b[33m%s\x1b[0m', `[DATABASE] WARNING: Connection to PostgreSQL failed (${err.message}).`);
    console.warn('\x1b[33m%s\x1b[0m', '[DATABASE] RUNNING IN IN-MEMORY MOCK DATABASE MODE.');
    useMock = true;
    await seedMockAdmin();
  }
};

const seedPostgresAdmin = async () => {
  try {
    const res = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(res.rows[0].count) === 0) {
      const adminName = process.env.ADMIN_NAME || 'System Administrator';
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@null.local';
      const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPass123!';
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      // Fetch administrator role ID
      const roleRes = await pool.query("SELECT role_id FROM roles WHERE role_name = 'Administrator'");
      let roleId = 1;
      if (roleRes.rows.length > 0) {
        roleId = roleRes.rows[0].role_id;
      }

      await pool.query(
        'INSERT INTO users (full_name, email, password_hash, role_id, status) VALUES ($1, $2, $3, $4, $5)',
        [adminName, adminEmail, hashedPassword, roleId, 'active']
      );
      console.log('[DATABASE] Seeded Administrator account in PostgreSQL.');
    }
  } catch (err) {
    console.error('[DATABASE] Error seeding admin in PostgreSQL:', err.message);
  }
};

const seedPostgresPolicies = async () => {
  try {
    const res = await pool.query('SELECT COUNT(*) FROM policies');
    if (parseInt(res.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO policies (role_id, resource_name, access_condition) VALUES 
        ((SELECT role_id FROM roles WHERE role_name = 'Administrator'), 'Admin Console', 'trusted_device AND active_session'),
        ((SELECT role_id FROM roles WHERE role_name = 'Employee'), 'HR Portal', 'trusted_device AND active_session'),
        ((SELECT role_id FROM roles WHERE role_name = 'Guest'), 'Public Portal', 'active_session')
      `);
      console.log('[DATABASE] Seeded default access policies in PostgreSQL.');
    }
  } catch (err) {
    console.error('[DATABASE] Error seeding default policies in PostgreSQL:', err.message);
  }
};

const seedPostgresTranscripts = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS student_transcripts (
          transcript_id SERIAL PRIMARY KEY,
          student_id VARCHAR(20) UNIQUE NOT NULL,
          student_name VARCHAR(255) NOT NULL,
          programme VARCHAR(255) NOT NULL,
          academic_year VARCHAR(20) NOT NULL,
          courses JSONB NOT NULL,
          last_modified_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
          last_modified_at TIMESTAMP DEFAULT NOW()
      )
    `);
    const res = await pool.query('SELECT COUNT(*) FROM student_transcripts');
    if (parseInt(res.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO student_transcripts (student_id, student_name, programme, academic_year, courses) VALUES
        ('STU2023001', 'Amara Diallo', 'BSc Computer Science', 'Year 2',
         '[{"code":"CSCI101","name":"Introduction to Programming","credits":3,"grade":"A"},{"code":"MATH101","name":"Calculus I","credits":3,"grade":"B"},{"code":"CSCI102","name":"Data Structures","credits":3,"grade":"A"},{"code":"ENGL101","name":"Communication Skills","credits":2,"grade":"B"}]'),
        ('STU2023002', 'Ngozi Okafor', 'BSc Cybersecurity', 'Year 2',
         '[{"code":"CSCI101","name":"Introduction to Programming","credits":3,"grade":"B"},{"code":"MATH101","name":"Calculus I","credits":3,"grade":"C"},{"code":"SECU101","name":"Network Security Fundamentals","credits":3,"grade":"A"},{"code":"ENGL101","name":"Communication Skills","credits":2,"grade":"A"}]'),
        ('STU2023003', 'Kwame Mensah', 'BSc Information Systems', 'Year 1',
         '[{"code":"CSCI101","name":"Introduction to Programming","credits":3,"grade":"C"},{"code":"MATH101","name":"Calculus I","credits":3,"grade":"B"},{"code":"ENGL101","name":"Communication Skills","credits":2,"grade":"B"}]')
      `);
      console.log('[DATABASE] Seeded student transcripts in PostgreSQL.');
    }
  } catch (err) {
    console.error('[DATABASE] Error seeding student transcripts in PostgreSQL:', err.message);
  }
};

// Database Methods

// Roles
const getRoles = async () => {
  if (useMock) {
    return mockDb.roles;
  }
  const res = await pool.query('SELECT * FROM roles ORDER BY role_id');
  return res.rows;
};

const getRoleById = async (roleId) => {
  if (useMock) {
    return mockDb.roles.find(r => r.role_id === parseInt(roleId)) || null;
  }
  const res = await pool.query('SELECT * FROM roles WHERE role_id = $1', [roleId]);
  return res.rows[0] || null;
};

// Users
const getUserByEmail = async (email) => {
  if (useMock) {
    const user = mockDb.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) return null;
    // Return a shallow copy with role_name resolved
    const role = mockDb.roles.find(r => r.role_id === user.role_id);
    return { ...user, role_name: role ? role.role_name : 'Guest' };
  }
  const res = await pool.query(
    'SELECT u.*, r.role_name FROM users u JOIN roles r ON u.role_id = r.role_id WHERE u.email = $1',
    [email]
  );
  return res.rows[0] || null;
};

const getUserById = async (userId) => {
  if (useMock) {
    const user = mockDb.users.find(u => u.user_id === parseInt(userId));
    if (!user) return null;
    const role = mockDb.roles.find(r => r.role_id === user.role_id);
    return { ...user, role_name: role ? role.role_name : 'Guest' };
  }
  const res = await pool.query(
    'SELECT u.*, r.role_name FROM users u JOIN roles r ON u.role_id = r.role_id WHERE u.user_id = $1',
    [userId]
  );
  return res.rows[0] || null;
};

const createUser = async (fullName, email, passwordHash, roleId = 3) => {
  if (useMock) {
    const newId = mockDb.users.length > 0 ? Math.max(...mockDb.users.map(u => u.user_id)) + 1 : 1;
    const newUser = {
      user_id: newId,
      full_name: fullName,
      email,
      password_hash: passwordHash,
      totp_secret: null,
      totp_enabled: false,
      role_id: parseInt(roleId),
      status: 'active',
      created_at: new Date()
    };
    mockDb.users.push(newUser);
    return newUser;
  }
  const res = await pool.query(
    'INSERT INTO users (full_name, email, password_hash, role_id, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [fullName, email, passwordHash, roleId, 'active']
  );
  return res.rows[0];
};

const updateUserTotp = async (userId, totpSecret, totpEnabled) => {
  if (useMock) {
    const user = mockDb.users.find(u => u.user_id === parseInt(userId));
    if (user) {
      user.totp_secret = totpSecret;
      user.totp_enabled = totpEnabled;
      return user;
    }
    return null;
  }
  const res = await pool.query(
    'UPDATE users SET totp_secret = $1, totp_enabled = $2 WHERE user_id = $3 RETURNING *',
    [totpSecret, totpEnabled, userId]
  );
  return res.rows[0];
};

const updateUserRoleAndStatus = async (userId, roleId, status) => {
  if (useMock) {
    const user = mockDb.users.find(u => u.user_id === parseInt(userId));
    if (user) {
      if (roleId !== undefined) user.role_id = parseInt(roleId);
      if (status !== undefined) user.status = status;
      return user;
    }
    return null;
  }
  const res = await pool.query(
    'UPDATE users SET role_id = COALESCE($1, role_id), status = COALESCE($2, status) WHERE user_id = $3 RETURNING *',
    [roleId, status, userId]
  );
  return res.rows[0];
};

const deleteUser = async (userId) => {
  if (useMock) {
    const idx = mockDb.users.findIndex(u => u.user_id === parseInt(userId));
    if (idx !== -1) {
      mockDb.users.splice(idx, 1);
      // Clean cascade manually
      mockDb.devices = mockDb.devices.filter(d => d.user_id !== parseInt(userId));
      mockDb.sessions = mockDb.sessions.filter(s => s.user_id !== parseInt(userId));
      return true;
    }
    return false;
  }
  await pool.query('DELETE FROM users WHERE user_id = $1', [userId]);
  return true;
};

const getAllUsers = async () => {
  if (useMock) {
    return mockDb.users.map(u => {
      const role = mockDb.roles.find(r => r.role_id === u.role_id);
      return { ...u, role_name: role ? role.role_name : 'Guest' };
    });
  }
  const res = await pool.query(
    'SELECT u.user_id, u.full_name, u.email, u.totp_enabled, u.role_id, r.role_name, u.status, u.created_at FROM users u JOIN roles r ON u.role_id = r.role_id ORDER BY u.user_id'
  );
  return res.rows;
};

// Devices
const getDeviceByFingerprint = async (fingerprint) => {
  if (useMock) {
    return mockDb.devices.find(d => d.device_fingerprint === fingerprint) || null;
  }
  const res = await pool.query('SELECT * FROM devices WHERE device_fingerprint = $1', [fingerprint]);
  return res.rows[0] || null;
};

const getUserDevices = async (userId) => {
  if (useMock) {
    return mockDb.devices.filter(d => d.user_id === parseInt(userId));
  }
  const res = await pool.query('SELECT * FROM devices WHERE user_id = $1 ORDER BY device_id', [userId]);
  return res.rows;
};

const getAllDevices = async () => {
  if (useMock) {
    return mockDb.devices.map(d => {
      const user = mockDb.users.find(u => u.user_id === d.user_id);
      return { ...d, user_name: user ? user.full_name : 'Unknown', user_email: user ? user.email : '' };
    });
  }
  const res = await pool.query(
    'SELECT d.*, u.full_name as user_name, u.email as user_email FROM devices d JOIN users u ON d.user_id = u.user_id ORDER BY d.device_id'
  );
  return res.rows;
};

const createDevice = async (userId, deviceName, fingerprint, trustStatus = 'pending') => {
  if (useMock) {
    const newId = mockDb.devices.length > 0 ? Math.max(...mockDb.devices.map(d => d.device_id)) + 1 : 1;
    const newDevice = {
      device_id: newId,
      user_id: parseInt(userId),
      device_name: deviceName,
      device_fingerprint: fingerprint,
      trust_status: trustStatus,
      registration_date: new Date()
    };
    mockDb.devices.push(newDevice);
    return newDevice;
  }
  const res = await pool.query(
    'INSERT INTO devices (user_id, device_name, device_fingerprint, trust_status) VALUES ($1, $2, $3, $4) RETURNING *',
    [userId, deviceName, fingerprint, trustStatus]
  );
  return res.rows[0];
};

const updateDeviceTrust = async (deviceId, trustStatus) => {
  if (useMock) {
    const device = mockDb.devices.find(d => d.device_id === parseInt(deviceId));
    if (device) {
      device.trust_status = trustStatus;
      return device;
    }
    return null;
  }
  const res = await pool.query(
    'UPDATE devices SET trust_status = $1 WHERE device_id = $2 RETURNING *',
    [trustStatus, deviceId]
  );
  return res.rows[0];
};

const deleteDevice = async (deviceId) => {
  if (useMock) {
    const idx = mockDb.devices.findIndex(d => d.device_id === parseInt(deviceId));
    if (idx !== -1) {
      mockDb.devices.splice(idx, 1);
      return true;
    }
    return false;
  }
  await pool.query('DELETE FROM devices WHERE device_id = $1', [deviceId]);
  return true;
};

// Policies
const getPoliciesByRoleId = async (roleId) => {
  if (useMock) {
    return mockDb.policies.filter(p => p.role_id === parseInt(roleId));
  }
  const res = await pool.query('SELECT * FROM policies WHERE role_id = $1', [roleId]);
  return res.rows;
};

const getAllPolicies = async () => {
  if (useMock) {
    return mockDb.policies.map(p => {
      const role = mockDb.roles.find(r => r.role_id === p.role_id);
      return { ...p, role_name: role ? role.role_name : 'Unknown' };
    });
  }
  const res = await pool.query(
    'SELECT p.*, r.role_name FROM policies p JOIN roles r ON p.role_id = r.role_id ORDER BY p.policy_id'
  );
  return res.rows;
};

const createPolicy = async (roleId, resourceName, accessCondition) => {
  if (useMock) {
    const newId = mockDb.policies.length > 0 ? Math.max(...mockDb.policies.map(p => p.policy_id)) + 1 : 1;
    const newPolicy = {
      policy_id: newId,
      role_id: parseInt(roleId),
      resource_name: resourceName,
      access_condition: accessCondition
    };
    mockDb.policies.push(newPolicy);
    return newPolicy;
  }
  const res = await pool.query(
    'INSERT INTO policies (role_id, resource_name, access_condition) VALUES ($1, $2, $3) RETURNING *',
    [roleId, resourceName, accessCondition]
  );
  return res.rows[0];
};

const updatePolicy = async (policyId, roleId, resourceName, accessCondition) => {
  if (useMock) {
    const policy = mockDb.policies.find(p => p.policy_id === parseInt(policyId));
    if (policy) {
      policy.role_id = parseInt(roleId);
      policy.resource_name = resourceName;
      policy.access_condition = accessCondition;
      return policy;
    }
    return null;
  }
  const res = await pool.query(
    'UPDATE policies SET role_id = $1, resource_name = $2, access_condition = $3 WHERE policy_id = $4 RETURNING *',
    [roleId, resourceName, accessCondition, policyId]
  );
  return res.rows[0];
};

const deletePolicy = async (policyId) => {
  if (useMock) {
    const idx = mockDb.policies.findIndex(p => p.policy_id === parseInt(policyId));
    if (idx !== -1) {
      mockDb.policies.splice(idx, 1);
      return true;
    }
    return false;
  }
  await pool.query('DELETE FROM policies WHERE policy_id = $1', [policyId]);
  return true;
};

// Sessions
const createSession = async (userId, token, expiryTime) => {
  if (useMock) {
    const newId = mockDb.sessions.length > 0 ? Math.max(...mockDb.sessions.map(s => s.session_id)) + 1 : 1;
    const newSession = {
      session_id: newId,
      user_id: parseInt(userId),
      token,
      login_time: new Date(),
      expiry_time: expiryTime,
      status: 'active'
    };
    mockDb.sessions.push(newSession);
    return newSession;
  }
  const res = await pool.query(
    'INSERT INTO sessions (user_id, token, expiry_time, status) VALUES ($1, $2, $3, $4) RETURNING *',
    [userId, token, expiryTime, 'active']
  );
  return res.rows[0];
};

const getSessionByToken = async (token) => {
  if (useMock) {
    return mockDb.sessions.find(s => s.token === token) || null;
  }
  const res = await pool.query('SELECT * FROM sessions WHERE token = $1', [token]);
  return res.rows[0] || null;
};

const getSessionById = async (sessionId) => {
  if (useMock) {
    return mockDb.sessions.find(s => s.session_id === parseInt(sessionId)) || null;
  }
  const res = await pool.query('SELECT * FROM sessions WHERE session_id = $1', [sessionId]);
  return res.rows[0] || null;
};

const getUserSessions = async (userId) => {
  if (useMock) {
    return mockDb.sessions.filter(s => s.user_id === parseInt(userId));
  }
  const res = await pool.query('SELECT * FROM sessions WHERE user_id = $1 ORDER BY session_id DESC', [userId]);
  return res.rows;
};

const getAllSessions = async () => {
  if (useMock) {
    return mockDb.sessions.map(s => {
      const user = mockDb.users.find(u => u.user_id === s.user_id);
      return { ...s, user_name: user ? user.full_name : 'Unknown', user_email: user ? user.email : '' };
    });
  }
  const res = await pool.query(
    'SELECT s.*, u.full_name as user_name, u.email as user_email FROM sessions s JOIN users u ON s.user_id = u.user_id ORDER BY s.session_id DESC'
  );
  return res.rows;
};

const updateSessionStatus = async (sessionId, status) => {
  if (useMock) {
    const session = mockDb.sessions.find(s => s.session_id === parseInt(sessionId));
    if (session) {
      session.status = status;
      return session;
    }
    return null;
  }
  const res = await pool.query(
    'UPDATE sessions SET status = $1 WHERE session_id = $2 RETURNING *',
    [status, sessionId]
  );
  return res.rows[0];
};

// Audit Logs
const createAuditLog = async (userId, activity, ipAddress) => {
  if (useMock) {
    const newId = mockDb.audit_logs.length > 0 ? Math.max(...mockDb.audit_logs.map(l => l.log_id)) + 1 : 1;
    const newLog = {
      log_id: newId,
      user_id: userId ? parseInt(userId) : null,
      activity,
      ip_address: ipAddress,
      timestamp: new Date()
    };
    mockDb.audit_logs.push(newLog);
    return newLog;
  }
  const res = await pool.query(
    'INSERT INTO audit_logs (user_id, activity, ip_address) VALUES ($1, $2, $3) RETURNING *',
    [userId, activity, ipAddress]
  );
  return res.rows[0];
};

const getAllAuditLogs = async (filters = {}) => {
  if (useMock) {
    let logs = [...mockDb.audit_logs];
    if (filters.user_id) {
      logs = logs.filter(l => l.user_id === parseInt(filters.user_id));
    }
    if (filters.activity) {
      logs = logs.filter(l => l.activity === filters.activity);
    }
    // Date range filtering is optional for demo, but we sort descending:
    logs.sort((a, b) => b.timestamp - a.timestamp);
    return logs.map(l => {
      const user = mockDb.users.find(u => u.user_id === l.user_id);
      return { ...l, user_name: user ? user.full_name : 'System/Anonymous', user_email: user ? user.email : '' };
    });
  }

  let queryText = `
    SELECT l.*, u.full_name as user_name, u.email as user_email 
    FROM audit_logs l 
    LEFT JOIN users u ON l.user_id = u.user_id 
  `;
  const queryParams = [];
  const clauses = [];

  if (filters.user_id) {
    queryParams.push(filters.user_id);
    clauses.push(`l.user_id = $${queryParams.length}`);
  }
  if (filters.activity) {
    queryParams.push(filters.activity);
    clauses.push(`l.activity = $${queryParams.length}`);
  }

  if (clauses.length > 0) {
    queryText += ' WHERE ' + clauses.join(' AND ');
  }

  queryText += ' ORDER BY l.timestamp DESC';

  const res = await pool.query(queryText, queryParams);
  return res.rows;
};

const getStudentTranscript = async (studentId) => {
  if (useMock) {
    return mockDb.student_transcripts.find(s => s.student_id === studentId) || null;
  }
  const res = await pool.query('SELECT * FROM student_transcripts WHERE student_id = $1', [studentId]);
  return res.rows[0] || null;
};


const getStudentTranscriptByEmail = async (email) => {
  let studentId = "STU2023001"; // Default demo guest
  if (email.toLowerCase().includes('okafor') || email.toLowerCase().includes('ngozi')) {
    studentId = "STU2023002";
  } else if (email.toLowerCase().includes('mensah') || email.toLowerCase().includes('kwame')) {
    studentId = "STU2023003";
  }
  return getStudentTranscript(studentId);
};

const getAllStudentTranscripts = async () => {
  if (useMock) {
    return mockDb.student_transcripts;
  }
  const res = await pool.query('SELECT * FROM student_transcripts ORDER BY student_id');
  return res.rows;
};

const updateStudentTranscript = async (studentId, courses, lastModifiedBy) => {
  if (useMock) {
    const idx = mockDb.student_transcripts.findIndex(s => s.student_id === studentId);
    if (idx !== -1) {
      mockDb.student_transcripts[idx].courses = courses;
      mockDb.student_transcripts[idx].last_modified_by = lastModifiedBy;
      mockDb.student_transcripts[idx].last_modified_at = new Date();
      return mockDb.student_transcripts[idx];
    }
    return null;
  }
  const res = await pool.query(
    'UPDATE student_transcripts SET courses = $1, last_modified_by = $2, last_modified_at = NOW() WHERE student_id = $3 RETURNING *',
    [JSON.stringify(courses), lastModifiedBy, studentId]
  );
  return res.rows[0];
};

const getAuditLogsFiltered = async (action) => {
  if (useMock) {
    let logs = [...mockDb.audit_logs];
    if (action) {
      logs = logs.filter(l => l.activity && l.activity.toLowerCase().includes(action.toLowerCase()));
    }
    logs.sort((a, b) => b.timestamp - a.timestamp);
    return logs.map(l => {
      const user = mockDb.users.find(u => u.user_id === l.user_id);
      return { ...l, user_name: user ? user.full_name : 'System/Anonymous', user_email: user ? user.email : '' };
    });
  }
  let queryText = `
    SELECT l.*, u.full_name as user_name, u.email as user_email 
    FROM audit_logs l 
    LEFT JOIN users u ON l.user_id = u.user_id 
  `;
  const queryParams = [];
  if (action) {
    queryParams.push(`%${action}%`);
    queryText += ` WHERE l.activity ILIKE $1 `;
  }
  queryText += ' ORDER BY l.timestamp DESC';
  const res = await pool.query(queryText, queryParams);
  return res.rows;
};

module.exports = {
  initDb,
  getRoles,
  getRoleById,
  getUserByEmail,
  getUserById,
  createUser,
  updateUserTotp,
  updateUserRoleAndStatus,
  deleteUser,
  getAllUsers,
  getDeviceByFingerprint,
  getUserDevices,
  getAllDevices,
  createDevice,
  updateDeviceTrust,
  deleteDevice,
  getPoliciesByRoleId,
  getAllPolicies,
  createPolicy,
  updatePolicy,
  deletePolicy,
  createSession,
  getSessionByToken,
  getSessionById,
  getUserSessions,
  getAllSessions,
  updateSessionStatus,
  createAuditLog,
  getAllAuditLogs,
  getStudentTranscript,
  getStudentTranscriptByEmail,
  getAllStudentTranscripts,
  updateStudentTranscript,
  getAuditLogsFiltered,
  isMock: () => useMock
};
