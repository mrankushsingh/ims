# How to Set FIREBASE_SERVICE_ACCOUNT in Railway

## Step-by-Step Guide

### Step 1: Get Your Firebase Service Account JSON

You already have this! It looks like:
```json
{
  "type": "service_account",
  "project_id": "anisa-28059",
  "private_key_id": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@anisa-28059.iam.gserviceaccount.com",
  "client_id": "xxxxxxxxxxxxxxxxxx",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40anisa-28059.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
}
```

### Step 2: Minify the JSON (Make it One Line)

**Option A: Online Tool (Easiest)**
1. Go to: https://jsonformatter.org/json-minify
2. Paste your complete Firebase service account JSON
3. Click "Minify" button
4. Copy the result (it will be all on one line)

**Option B: Manual**
- Remove all line breaks
- Remove extra spaces
- Keep the `\n` characters in the `private_key` field (they're important!)

**Result should look like:**
```
{"type":"service_account","project_id":"anisa-28059","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-xxxxx@anisa-28059.iam.gserviceaccount.com",...}
```

### Step 3: Add to Railway

1. **Go to Railway Dashboard**
   - Visit: https://railway.app
   - Sign in to your account

2. **Select Your Project**
   - Click on your project (the one with your backend service)

3. **Select Your Backend Service**
   - Click on the service that runs your backend (not the database)

4. **Go to Variables Tab**
   - Click on the service
   - Click on the **"Variables"** tab (or look for "Environment Variables")

5. **Add New Variable**
   - Click **"+ New Variable"** or **"Add Variable"** button
   - **Variable Name:** `FIREBASE_SERVICE_ACCOUNT`
   - **Variable Value:** Paste the minified JSON string (from Step 2)
   - Click **"Add"** or **"Save"**

6. **Verify**
   - You should see `FIREBASE_SERVICE_ACCOUNT` in your variables list
   - The value should be a very long single line of JSON

7. **Redeploy (if needed)**
   - Railway usually auto-redeploys when you add variables
   - If not, click "Redeploy" or "Deploy" button

### Step 4: Check Logs

After redeploying, check your Railway service logs. You should see:
```
✅ Firebase Admin SDK initialized
   Project ID: anisa-28059
✅ API routes protected with Firebase authentication
```

If you see errors, check:
- Is the JSON properly minified (all on one line)?
- Are all the fields present?
- Did you copy the entire JSON including all fields?

## Common Issues

### ❌ "Failed to parse FIREBASE_SERVICE_ACCOUNT JSON"
- **Problem:** JSON is not properly formatted
- **Solution:** Make sure it's minified correctly (all on one line)
- **Check:** Use the online minifier tool

### ❌ "FIREBASE_SERVICE_ACCOUNT not found"
- **Problem:** Variable name is wrong or not set
- **Solution:** 
  - Check variable name is exactly: `FIREBASE_SERVICE_ACCOUNT` (case-sensitive)
  - Make sure you added it to the correct service (backend, not database)

### ❌ "Firebase authentication disabled"
- **Problem:** Variable exists but JSON parsing failed
- **Solution:** 
  - Re-minify the JSON
  - Make sure all quotes are properly escaped
  - Check that `private_key` field has `\n` characters preserved

## Quick Checklist

- [ ] Firebase service account JSON obtained
- [ ] JSON minified (all on one line)
- [ ] Variable name: `FIREBASE_SERVICE_ACCOUNT` (exact, case-sensitive)
- [ ] Variable added to backend service (not database)
- [ ] Service redeployed
- [ ] Logs show "✅ Firebase Admin SDK initialized"

## Example Minified JSON Format

```
{"type":"service_account","project_id":"anisa-28059","private_key_id":"YOUR_PRIVATE_KEY_ID","private_key":"-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_CONTENT\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-xxxxx@anisa-28059.iam.gserviceaccount.com","client_id":"YOUR_CLIENT_ID","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40anisa-28059.iam.gserviceaccount.com","universe_domain":"googleapis.com"}
```

**Note:** 
- Replace `YOUR_PRIVATE_KEY_ID`, `YOUR_PRIVATE_KEY_CONTENT`, `YOUR_CLIENT_ID`, and `xxxxx` with your actual values
- The `\n` in `private_key` must be preserved as literal `\n` characters (not actual line breaks)
- The entire JSON must be on one line with no spaces between fields

