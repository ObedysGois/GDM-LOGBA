import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported } from 'firebase/messaging';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBla-ItwmWjbfqZWX-rPJb_L1kuT178uac",
  authDomain: "gdm-log-ba-2f8c5.firebaseapp.com",
  projectId: "gdm-log-ba-2f8c5",
  storageBucket: "gdm-log-ba-2f8c5.appspot.com",
  messagingSenderId: "345609111488",
  appId: "1:345609111488:web:6233ab1ee1de9af737ea25",
  measurementId: "G-FL1VKY0EH9"
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
