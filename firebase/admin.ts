import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin SDK
function initFirebaseAdmin() {
  const apps = getApps();

  if (apps.length === 0) {
    try {
      const serviceAccount = JSON.parse(
        process.env.FIREBASE_SERVICE_ACCOUNT || '{}'
      );
      
      initializeApp({
        credential: cert(serviceAccount),
      });
    } catch (error) {
      console.error('Failed to initialize Firebase Admin:', error);
      throw error;
    }
  }
  
  return {
    auth: getAuth(),
    db: getFirestore(),
  };
}

export const { auth, db } = initFirebaseAdmin();