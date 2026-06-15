// Device Fingerprint Generator
// Combines hardware and browser traits with a persistent local identifier.

function hashString(str) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(16, '0');
}

export const getDeviceFingerprint = () => {
  // 1. Resolve or generate a persistent local device ID
  let localDeviceId = localStorage.getItem('null_device_id');
  if (!localDeviceId) {
    localDeviceId = 'dev_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('null_device_id', localDeviceId);
  }

  // 2. Collect hardware and browser attributes
  const traits = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    colorDepth: screen.colorDepth,
    screenWidth: screen.width,
    screenHeight: screen.height,
    timezoneOffset: new Date().getTimezoneOffset(),
    hardwareConcurrency: navigator.hardwareConcurrency || 4,
    localDeviceId
  };

  // 3. Stringify and hash
  const fingerprintDataString = JSON.stringify(traits);
  const fingerprintHash = hashString(fingerprintDataString);

  return {
    fingerprint: fingerprintHash,
    deviceName: getBrowserName()
  };
};

const getBrowserName = () => {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Mozilla Firefox';
  if (ua.includes('SamsungBrowser')) return 'Samsung Internet';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  if (ua.includes('Trident')) return 'Microsoft Internet Explorer';
  if (ua.includes('Edge') || ua.includes('Edg')) return 'Microsoft Edge';
  if (ua.includes('Chrome')) return 'Google Chrome';
  if (ua.includes('Safari')) return 'Apple Safari';
  return 'Browser (Generic)';
};
