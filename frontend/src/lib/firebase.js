import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCWGJjCv8yta0O0yOKomC6UpnNqTduQBH4",
  authDomain: "idea2exeution.firebaseapp.com",
  databaseURL: "https://idea2exeution-default-rtdb.firebaseio.com",
  projectId: "idea2exeution",
  storageBucket: "idea2exeution.firebasestorage.app",
  messagingSenderId: "631449358720",
  appId: "1:631449358720:web:edb25ee2312e9df90d3165",
  measurementId: "G-7YF401PM1X"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
