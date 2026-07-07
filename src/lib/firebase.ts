import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "sigma-anchor-fh7sp",
  appId: "1:16883860361:web:1c7dcd6123e62fb38dd758",
  apiKey: "AIzaSyCxUhZG8CNsXx64v7hVCVoMEBxuq2DyIjY",
  authDomain: "sigma-anchor-fh7sp.firebaseapp.com",
  storageBucket: "sigma-anchor-fh7sp.firebasestorage.app",
  messagingSenderId: "16883860361",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, "ai-studio-yatimagang-1199b36c-02a9-45a4-b81b-7f6632391384");
