// Copy these values from Firebase Console → Project settings → Your apps.
// This web configuration is safe to use in client code. Never put a Firebase
// Admin private key or service-account JSON file in this repository.
export const firebaseConfig = {
  apiKey: "AIzaSyAWKeSKiZADVVx0dlmmo4WY5OjpSiuQExg",
  authDomain: "gymp-408a0.firebaseapp.com",
  projectId: "gymp-408a0",
  storageBucket: "gymp-408a0.firebasestorage.app",
  messagingSenderId: "156684104175",
  appId: "1:156684104175:web:638c8ee0ecce74f650061a"
};

export const firebaseConfigured = !Object.values(firebaseConfig).some(value => value.startsWith("PASTE_"));
