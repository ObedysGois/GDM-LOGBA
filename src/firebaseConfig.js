import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported } from 'firebase/messaging';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyBla-ItwmWjbfqZWX-rPJb_L1kuT178uac",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "gdm-log-ba-2f8c5.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "gdm-log-ba-2f8c5",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "gdm-log-ba-2f8c5.appspot.com",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "345609111488",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:345609111488:web:6233ab1ee1de9af737ea25",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-FL1VKY0EH9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Initialize Firebase Cloud Messaging and get a reference to the service
let messaging = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      messaging = getMessaging(app);
    }
  });
}

export { db, auth, storage, messaging };
