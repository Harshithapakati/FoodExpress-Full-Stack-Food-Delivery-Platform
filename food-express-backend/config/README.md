Place your Firebase service account JSON file here and name it `firebase-service-account.json`.

Steps:
1. In Firebase Console -> Project Settings -> Service accounts -> Generate new private key.
2. Download the JSON and save it to this folder as `firebase-service-account.json`.
3. Ensure this file is not committed to source control. This folder's .gitignore already ignores it.

Alternatively, set the environment variable `SERVICE_ACCOUNT_JSON` with the JSON content (not recommended for large files).
