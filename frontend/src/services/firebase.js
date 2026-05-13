import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDJdetlNPhbkEik7AjEclkYqwD8C85WHXE",
  authDomain: "food-hunger-app-71610.firebaseapp.com",
  projectId: "food-hunger-app-71610",
  storageBucket: "food-hunger-app-71610.firebasestorage.app",
  messagingSenderId: "1026449905763",
  appId: "1:1026449905763:web:00ee3360c3a45d1b8a0056",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export { firebaseConfig };
