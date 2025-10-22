// firebase-config.js
// IMPORTANTE: Este arquivo contém configurações sensíveis
// Mantenha este arquivo no servidor e use regras de segurança do Firebase
// Adicione este arquivo ao .gitignore se estiver usando controle de versão

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAbtd_UifgYk71Wlp7eeXxjFssEkf1T10o",
  authDomain: "gov-jornal-desastres.firebaseapp.com",
  projectId: "gov-jornal-desastres",
  storageBucket: "gov-jornal-desastres.firebasestorage.app",
  messagingSenderId: "179260328185",
  appId: "1:179260328185:web:6d023088efbeec312d3a28",
  measurementId: "G-HJE33Q1YZ7"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const analytics = getAnalytics(app);

// Email do administrador
const ADMIN_EMAIL = 'kartywillytdc@gmail.com';

// Exportar para uso em outros arquivos
export { app, auth, db, storage, analytics, ADMIN_EMAIL };
