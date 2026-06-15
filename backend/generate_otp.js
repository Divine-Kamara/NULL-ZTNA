const { authenticator } = require('otplib');

const secret = process.argv[2];
if (!secret) {
  console.error('Usage: node generate_otp.js <SECRET_KEY>');
  process.exit(1);
}

try {
  const token = authenticator.generate(secret);
  console.log(`TOKEN: ${token}`);
} catch (err) {
  console.error('Error generating token:', err.message);
  process.exit(1);
}
