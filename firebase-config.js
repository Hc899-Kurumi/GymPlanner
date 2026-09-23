// Copy these values from Firebase Console → Project settings → Your apps.
// This web configuration is safe to use in client code. Never put a Firebase
// Admin private key or service-account JSON file in this repository.
export const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY",
  authDomain: "PASTE_YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "PASTE_YOUR_PROJECT_ID",
  storageBucket: "PASTE_YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "PASTE_YOUR_MESSAGING_SENDER_ID",
  appId: "PASTE_YOUR_APP_ID"
};

export const firebaseConfigured = !Object.values(firebaseConfig).some(value => value.startsWith("PASTE_"));
