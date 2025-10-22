// app.js
import { auth, db, storage, ADMIN_EMAIL } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    collection, 
    addDoc, 
    getDocs, 
    deleteDoc, 
    doc, 
    query, 
    orderBy, 
    serverTimestamp,
    setDoc,
    getDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
    ref, 
    uploadBytes, 
    getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// Estado global
let currentUser = null;
let currentRating = 0;

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
});

// Monitorar estado de autenticação
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        loadUserProfile(user);
        showMainContent();
    } else {
        currentUser = null;
        showAuthSection();
    }
    hideLoading();
});

// Inicializar aplicação
function initializeApp() {
    showLoading();
    loadThemeSettings();
    loadReviews();
    loadVideoContent();
    loadGalleryImages();
}

// Setup Event Listeners
function setupEventListeners() {
    // Login Form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Register Form
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    
    // Review Form
    document.getElementById('reviewForm').addEventListener('submit', handleReviewSubmit);
    
    // Rating Stars
    const stars = document.querySelectorAll('#ratingInput i');
    stars.forEach(star => {
        star.addEventListener
