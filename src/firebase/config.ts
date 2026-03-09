import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyAvYo_MD3GB2NT1vxF1VozLeee4EaeFN0M',
  authDomain: 'app-pediu-chegou-3b84f.firebaseapp.com',
  projectId: 'app-pediu-chegou-3b84f',
  storageBucket: 'app-pediu-chegou-3b84f.firebasestorage.app',
  messagingSenderId: '130269211129',
  appId: '1:130269211129:web:1aa1a93d520588394df528',
};

// PROTEÇÃO: Inicializa apenas se não houver um app rodando
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;
