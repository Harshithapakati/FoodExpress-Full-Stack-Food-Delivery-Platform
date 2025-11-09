const admin = require('firebase-admin');

// Initialize Firebase Admin SDK using service account JSON in env var
// You can set SERVICE_ACCOUNT_JSON to the JSON string of the service account
// or set SERVICE_ACCOUNT_PATH to a local file path containing the JSON.

function initFirebase() {
  if (admin.apps && admin.apps.length) return admin.app();

  const serviceAccountJson = process.env.SERVICE_ACCOUNT_JSON;
  const serviceAccountPath = process.env.SERVICE_ACCOUNT_PATH;

  let credential;
  if (serviceAccountJson) {
    try {
      const parsed = JSON.parse(serviceAccountJson);
      credential = admin.credential.cert(parsed);
    } catch (err) {
      console.error('Failed to parse SERVICE_ACCOUNT_JSON:', err.message);
      throw err;
    }
  } else if (serviceAccountPath) {
    // Resolve the path relative to project root if a relative path is provided in .env
    const path = require('path');
    const fs = require('fs');
    let resolvedPath = serviceAccountPath;
    if (!path.isAbsolute(serviceAccountPath)) {
      // serviceAccountPath is relative to backend root; admin.js is in backend/firebase
      // so resolve against the parent directory of this file (project backend root)
      resolvedPath = path.resolve(__dirname, '..', serviceAccountPath);
    }
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Service account JSON not found at resolved path: ${resolvedPath}`);
    }
    credential = admin.credential.cert(require(resolvedPath));
  } else {
    // Try default application credentials (if running in GCP or configured locally)
    credential = admin.credential.applicationDefault();
  }

  admin.initializeApp({ credential });
  console.log('✅ Firebase Admin initialized');
  return admin.app();
}

module.exports = { initFirebase, admin };
