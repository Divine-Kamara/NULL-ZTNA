const { authenticator } = require('otplib');
const qrcode = require('qrcode');

authenticator.options = { window: 2 }; // Allow 1-minute drift before/after current time

const TOTP_ISSUER = process.env.TOTP_ISSUER || 'NULL-ZTNA';

/**
 * Generate a new TOTP secret and QR code.
 */
const setupTotp = async (email) => {
  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(email, TOTP_ISSUER, secret);
  const qrCodeDataUrl = await qrcode.toDataURL(otpauth);
  
  return {
    secret,
    qrCodeDataUrl,
    otpauth
  };
};

/**
 * Verify a TOTP code against a base32 secret.
 */
const verifyTotp = (token, secret) => {
  try {
    // Authenticator verify returns boolean
    return authenticator.verify({ token, secret });
  } catch (err) {
    console.error('TOTP verify error:', err.message);
    return false;
  }
};

module.exports = {
  setupTotp,
  verifyTotp
};
