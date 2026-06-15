const db = require('../db');

const logActivity = async (userId, activity, ipAddress) => {
  try {
    const log = await db.createAuditLog(userId, activity, ipAddress);
    console.log(`[AUDIT LOG] User: ${userId || 'System'} | Activity: ${activity} | IP: ${ipAddress}`);
    return log;
  } catch (err) {
    console.error('[AUDIT LOG ERROR]', err.message);
  }
};

module.exports = {
  logActivity
};
