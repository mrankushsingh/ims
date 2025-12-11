// Helper script to format Firebase service account JSON for Railway environment variable
// Usage: node format-firebase-env.js

const serviceAccount = {
  "type": "service_account",
  "project_id": "anisa-28059",
  "private_key_id": "YOUR_PRIVATE_KEY_ID_HERE",
  "private_key": "-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@anisa-28059.iam.gserviceaccount.com",
  "client_id": "YOUR_CLIENT_ID_HERE",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40anisa-28059.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

// Minify JSON (remove all whitespace)
const minified = JSON.stringify(serviceAccount);

console.log('\n=== Copy this value to Railway FIREBASE_SERVICE_ACCOUNT variable ===\n');
console.log(minified);
console.log('\n=== End of value ===\n');
console.log('Instructions:');
console.log('1. Replace the placeholder values with your actual Firebase service account values');
console.log('2. Copy the entire minified JSON string above');
console.log('3. In Railway, go to your service → Variables');
console.log('4. Add variable: FIREBASE_SERVICE_ACCOUNT');
console.log('5. Paste the minified JSON as the value');
console.log('6. Save and redeploy\n');

