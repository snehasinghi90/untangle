import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDm71I6ondFkvScHW1NLWf4BzDxqSXBG0g",
  authDomain: "untangle-ee336.firebaseapp.com",
  projectId: "untangle-ee336",
  storageBucket: "untangle-ee336.firebasestorage.app",
  messagingSenderId: "702254478048",
  appId: "1:702254478048:web:a8b0ec8c52bbbec60d1685"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

signInAnonymously(auth).catch(console.error);
