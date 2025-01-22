/**************************************************************
 * src/firebase.js
 **************************************************************/
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

console.log("Checking React environment variables:");
console.log("REACT_APP_FIREBASE_API_KEY:", process.env.REACT_APP_FIREBASE_API_KEY);
console.log("REACT_APP_FIREBASE_AUTH_DOMAIN:", process.env.REACT_APP_FIREBASE_AUTH_DOMAIN);
console.log("REACT_APP_FIREBASE_PROJECT_ID:", process.env.REACT_APP_FIREBASE_PROJECT_ID);
console.log("REACT_APP_FIREBASE_STORAGE_BUCKET:", process.env.REACT_APP_FIREBASE_STORAGE_BUCKET);
console.log("REACT_APP_FIREBASE_MESSAGING_SENDER_ID:", process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID);
console.log("REACT_APP_FIREBASE_APP_ID:", process.env.REACT_APP_FIREBASE_APP_ID);
console.log("REACT_APP_FIREBASE_MEASUREMENT_ID:", process.env.REACT_APP_FIREBASE_MEASUREMENT_ID);

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
