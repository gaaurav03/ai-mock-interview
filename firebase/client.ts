// Import the functions you need from the SDKs you need
import { getApp, getApps, initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAWPdmKMIKlapuovS6XaopM_DuzvhltjB8",
  authDomain: "ai-interview-bot-2e91d.firebaseapp.com",
  projectId: "ai-interview-bot-2e91d",
  storageBucket: "ai-interview-bot-2e91d.firebasestorage.app",
  messagingSenderId: "613186186026",
  appId: "1:613186186026:web:5e38182d3ed99892ffcc53",
  measurementId: "G-E5D6CV308F"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
// const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const db = getFirestore(app);
