import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyCSwKKjxqPL2WqA8DvVnd5VUjsCAW1dnyk",
  authDomain: "sistema-estudiantil-58bc2.firebaseapp.com",
  projectId: "sistema-estudiantil-58bc2",
  storageBucket: "sistema-estudiantil-58bc2.firebasestorage.app",
  messagingSenderId: "198903164734",
  appId: "1:198903164734:web:0715479d97eb392ae7866f",
  measurementId: "G-BPGXR9BV6R"
};

const app = initializeApp(firebaseConfig);

export const auth     = getAuth(app);
export const db       = getFirestore(app);
export const storage  = getStorage(app);
export const functions = getFunctions(app, 'us-central1');

// Secondary app para poder crear cuentas (estudiantes) sin cerrar la sesión
// del administrador activo.
const secondaryApp = initializeApp(firebaseConfig, "Secondary");
export const secondaryAuth = getAuth(secondaryApp);
