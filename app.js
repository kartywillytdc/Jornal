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
        star.addEventListenerstar.addEventListener('click', () => {
            const rating = parseInt(star.dataset.rating);
            currentRating = rating;
            updateStarDisplay(rating);
        });
        
        star.addEventListener('mouseenter', () => {
            const rating = parseInt(star.dataset.rating);
            updateStarDisplay(rating);
        });
    });
    
    document.getElementById('ratingInput').addEventListener('mouseleave', () => {
        updateStarDisplay(currentRating);
    });
}

// Autenticação
async function handleLogin(e) {
    e.preventDefault();
    showLoading();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        hideLoading();
    } catch (error) {
        hideLoading();
        alert('Erro ao fazer login: ' + error.message);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    showLoading();
    
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const fullName = document.getElementById('registerFullName').value;
    const nickname = document.getElementById('registerNickname').value;
    const avatarFile = document.getElementById('avatarInput').files[0];
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        let avatarUrl = '';
        if (avatarFile) {
            avatarUrl = await uploadAvatar(user.uid, avatarFile);
        }
        
        await setDoc(doc(db, 'users', user.uid), {
            fullName: fullName,
            nickname: nickname,
            email: email,
            avatar: avatarUrl,
            createdAt: serverTimestamp(),
            isAdmin: email === ADMIN_EMAIL
        });
        
        hideLoading();
    } catch (error) {
        hideLoading();
        alert('Erro ao criar conta: ' + error.message);
    }
}

async function logout() {
    try {
        await signOut(auth);
        location.reload();
    } catch (error) {
        alert('Erro ao sair: ' + error.message);
    }
}

// Perfil do usuário
async function loadUserProfile(user) {
    try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        
        if (userData) {
            // Atualizar avatar no header
            const userAvatar = document.getElementById('userAvatar');
            if (userData.avatar) {
                userAvatar.innerHTML = `<img src="${userData.avatar}" alt="Avatar">`;
            } else {
                userAvatar.innerHTML = `<i class="fas fa-user"></i>`;
            }
            
            // Atualizar perfil
            document.getElementById('profileName').textContent = userData.fullName;
            document.getElementById('profileUsername').textContent = '@' + userData.nickname;
            
            const profileAvatarLarge = document.getElementById('profileAvatarLarge');
            if (userData.avatar) {
                profileAvatarLarge.innerHTML = `<img src="${userData.avatar}" alt="Avatar">`;
            } else {
                profileAvatarLarge.innerHTML = userData.fullName.charAt(0).toUpperCase();
            }
            
            // Email no formulário de review
            document.getElementById('reviewEmail').value = user.email;
            
            // Data de entrada
            if (userData.createdAt) {
                const joinYear = new Date(userData.createdAt.toDate()).getFullYear();
                document.getElementById('statJoinDate').textContent = joinYear;
            }
            
            // Carregar estatísticas
            await loadUserStats(user.uid);
            
            // Mostrar uploads de admin se for administrador
            if (userData.isAdmin) {
                document.getElementById('videoUpload').classList.add('show');
                document.getElementById('galleryUpload').classList.add('show');
                
                // Mostrar botões de deletar reviews
                document.querySelectorAll('.delete-review').forEach(btn => {
                    btn.classList.add('show');
                });
            }
        }
    } catch (error) {
        console.error('Erro ao carregar perfil:', error);
    }
}

async function loadUserStats(userId) {
    try {
        const reviewsQuery = query(
            collection(db, 'reviews'),
            orderBy('createdAt', 'desc')
        );
        const reviewsSnapshot = await getDocs(reviewsQuery);
        
        let userReviews = 0;
        let totalRating = 0;
        
        reviewsSnapshot.forEach(doc => {
            const review = doc.data();
            if (review.userId === userId) {
                userReviews++;
                totalRating += review.rating;
            }
        });
        
        document.getElementById('statReviews').textContent = userReviews;
        document.getElementById('statRating').textContent = 
            userReviews > 0 ? (totalRating / userReviews).toFixed(1) : '0.0';
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
    }
}

// Upload de Avatar
async function uploadAvatar(userId, file) {
    const storageRef = ref(storage, `avatars/${userId}/${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
}

function previewAvatar(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('avatarPreview').innerHTML = 
                `<img src="${e.target.result}" alt="Preview">`;
        };
        reader.readAsDataURL(file);
    }
}

async function updateProfileAvatar(event) {
    const file = event.target.files[0];
    if (file && currentUser) {
        showLoading();
        try {
            const avatarUrl = await uploadAvatar(currentUser.uid, file);
            await updateDoc(doc(db, 'users', currentUser.uid), {
                avatar: avatarUrl
            });
            
            document.getElementById('profileAvatarLarge').innerHTML = 
                `<img src="${avatarUrl}" alt="Avatar">`;
            document.getElementById('userAvatar').innerHTML = 
                `<img src="${avatarUrl}" alt="Avatar">`;
            
            hideLoading();
        } catch (error) {
            hideLoading();
            alert('Erro ao atualizar avatar: ' + error.message);
        }
    }
}

// Reviews
async function handleReviewSubmit(e) {
    e.preventDefault();
    
    if (!currentUser) {
        alert('Você precisa estar logado para avaliar!');
        return;
    }
    
    if (currentRating === 0) {
        alert('Por favor, selecione uma avaliação em estrelas!');
        return;
    }
    
    showLoading();
    
    const comment = document.getElementById('reviewComment').value;
    
    try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const userData = userDoc.data();
        
        await addDoc(collection(db, 'reviews'), {
            userId: currentUser.uid,
            email: currentUser.email,
            fullName: userData.fullName,
            nickname: userData.nickname,
            avatar: userData.avatar || '',
            rating: currentRating,
            comment: comment,
            createdAt: serverTimestamp()
        });
        
        document.getElementById('reviewComment').value = '';
        currentRating = 0;
        updateStarDisplay(0);
        
        await loadReviews();
        hideLoading();
        alert('Avaliação enviada com sucesso!');
    } catch (error) {
        hideLoading();
        alert('Erro ao enviar avaliação: ' + error.message);
    }
}

async function loadReviews() {
    try {
        const reviewsQuery = query(
            collection(db, 'reviews'),
            orderBy('createdAt', 'desc')
        );
        const reviewsSnapshot = await getDocs(reviewsQuery);
        const reviewsList = document.getElementById('reviewsList');
        
        if (reviewsSnapshot.empty) {
            reviewsList.innerHTML = `
                <div style="text-align: center; color: var(--text-secondary); padding: 2rem;">
                    <i class="fas fa-comment-slash" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <p>Nenhuma avaliação ainda. Seja o primeiro a avaliar!</p>
                </div>
            `;
            return;
        }
        
        reviewsList.innerHTML = '';
        
        reviewsSnapshot.forEach(docSnap => {
            const review = docSnap.data();
            const reviewId = docSnap.id;
            
            const reviewDate = review.createdAt ? 
                new Date(review.createdAt.toDate()).toLocaleDateString('pt-BR') : 
                'Data desconhecida';
            
            const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
            
            const avatarHtml = review.avatar ? 
                `<img src="${review.avatar}" alt="${review.fullName}">` :
                review.fullName.charAt(0).toUpperCase();
            
            const reviewHtml = `
                <div class="review-item">
                    <div class="review-header">
                        <div class="review-user">
                            <div class="review-avatar">${avatarHtml}</div>
                            <div class="review-info">
                                <h4>${review.fullName} <span style="color: var(--text-secondary); font-weight: 400;">(@${review.nickname})</span></h4>
                                <div class="review-rating">${stars}</div>
                            </div>
                        </div>
                        <div>
                            <div class="review-date">${reviewDate}</div>
                            <button class="delete-review" onclick="deleteReview('${reviewId}')" data-review-id="${reviewId}">
                                <i class="fas fa-trash"></i> Excluir
                            </button>
                        </div>
                    </div>
                    <p class="review-text">${review.comment}</p>
                </div>
            `;
            
            reviewsList.innerHTML += reviewHtml;
        });
        
        // Mostrar botões de deletar se for admin
        if (currentUser) {
            const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
            const userData = userDoc.data();
            if (userData && userData.isAdmin) {
                document.querySelectorAll('.delete-review').forEach(btn => {
                    btn.classList.add('show');
                });
            }
        }
    } catch (error) {
        console.error('Erro ao carregar avaliações:', error);
    }
}

async function deleteReview(reviewId) {
    if (!confirm('Tem certeza que deseja excluir esta avaliação?')) {
        return;
    }
    
    showLoading();
    try {
        await deleteDoc(doc(db, 'reviews', reviewId));
        await loadReviews();
        hideLoading();
    } catch (error) {
        hideLoading();
        alert('Erro ao excluir avaliação: ' + error.message);
    }
}

function updateStarDisplay(rating) {
    const stars = document.querySelectorAll('#ratingInput i');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

// Upload de Vídeo
async function uploadVideo() {
    const videoUrl = document.getElementById('videoUrl').value;
    
    if (!videoUrl) {
        alert('Por favor, insira uma URL de vídeo!');
        return;
    }
    
    // Extrair ID do YouTube
    let videoId = '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = videoUrl.match(regExp);
    
    if (match && match[2].length === 11) {
        videoId = match[2];
    } else {
        alert('URL de vídeo inválida! Use uma URL do YouTube.');
        return;
    }
    
    showLoading();
    try {
        await setDoc(doc(db, 'content', 'mainVideo'), {
            videoId: videoId,
            videoUrl: videoUrl,
            updatedAt: serverTimestamp()
        });
        
        await loadVideoContent();
        hideLoading();
        alert('Vídeo atualizado com sucesso!');
    } catch (error) {
        hideLoading();
        alert('Erro ao atualizar vídeo: ' + error.message);
    }
}

async function loadVideoContent() {
    try {
        const videoDoc = await getDoc(doc(db, 'content', 'mainVideo'));
        
        if (videoDoc.exists()) {
            const data = videoDoc.data();
            const videoContainer = document.getElementById('videoContainer');
            
            videoContainer.innerHTML = `
                <iframe 
                    width="100%" 
                    height="100%" 
                    src="https://www.youtube.com/embed/${data.videoId}" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen
                    style="border-radius: 16px;">
                </iframe>
            `;
        }
    } catch (error) {
        console.error('Erro ao carregar vídeo:', error);
    }
}

// Upload de Galeria
async function uploadGalleryImages(event) {
    const files = event.target.files;
    
    if (files.length === 0) {
        return;
    }
    
    showLoading();
    
    try {
        for (let file of files) {
            const imageId = Date.now() + '_' + file.name;
            const storageRef = ref(storage, `gallery/${imageId}`);
            await uploadBytes(storageRef, file);
            const imageUrl = await getDownloadURL(storageRef);
            
            await addDoc(collection(db, 'gallery'), {
                imageUrl: imageUrl,
                imageId: imageId,
                uploadedAt: serverTimestamp()
            });
        }
        
        await loadGalleryImages();
        hideLoading();
        alert('Imagens adicionadas com sucesso!');
    } catch (error) {
        hideLoading();
        alert('Erro ao fazer upload das imagens: ' + error.message);
    }
}

async function loadGalleryImages() {
    try {
        const galleryQuery = query(
            collection(db, 'gallery'),
            orderBy('uploadedAt', 'desc')
        );
        const gallerySnapshot = await getDocs(galleryQuery);
        const galleryGrid = document.getElementById('galleryGrid');
        
        if (gallerySnapshot.empty) {
            return;
        }
        
        galleryGrid.innerHTML = '';
        
        gallerySnapshot.forEach(docSnap => {
            const image = docSnap.data();
            
            const galleryHtml = `
                <div class="gallery-item">
                    <img src="${image.imageUrl}" alt="Gallery Image" 
                         style="width: 100%; height: 100%; object-fit: cover;">
                </div>
            `;
            
            galleryGrid.innerHTML += galleryHtml;
        });
    } catch (error) {
        console.error('Erro ao carregar galeria:', error);
    }
}

// Configurações
function openSettings() {
    document.getElementById('settingsModal').classList.add('show');
}

function closeSettings() {
    document.getElementById('settingsModal').classList.remove('show');
}

function changeTheme(color) {
    document.querySelectorAll('.color-option').forEach(opt => {
        opt.classList.remove('active');
    });
    
    event.target.classList.add('active');
    
    const root = document.documentElement;
    
    if (color === 'rainbow') {
        root.style.setProperty('--accent-color', '#007aff');
        root.style.setProperty('--accent-hover', '#0051d5');
        
        // Adicionar efeito rainbow em elementos específicos
        document.querySelectorAll('.btn-primary, .logo i').forEach(el => {
            el.style.background = 'linear-gradient(90deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3)';
            el.style.backgroundSize = '200% 200%';
            el.style.animation = 'rainbow 3s ease infinite';
            el.style.webkitBackgroundClip = 'text';
            el.style.webkitTextFillColor = 'transparent';
        });
    } else {
        // Remover efeito rainbow
        document.querySelectorAll('.btn-primary, .logo i').forEach(el => {
            el.style.background = '';
            el.style.backgroundSize = '';
            el.style.animation = '';
            el.style.webkitBackgroundClip = '';
            el.style.webkitTextFillColor = '';
        });
        
        root.style.setProperty('--accent-color', color);
        
        // Calcular cor hover (mais escura)
        const hoverColor = adjustBrightness(color, -20);
        root.style.setProperty('--accent-hover', hoverColor);
    }
    
    localStorage.setItem('themeColor', color);
}

function changeFont(fontName) {
    document.querySelectorAll('.font-option').forEach(opt => {
        opt.classList.remove('active');
    });
    
    event.target.classList.add('active');
    
    const fontFamilies = {
        'system': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        'arial': 'Arial, sans-serif',
        'georgia': 'Georgia, serif',
        'courier': '"Courier New", monospace',
        'verdana': 'Verdana, sans-serif'
    };
    
    document.documentElement.style.setProperty('--font-family', fontFamilies[fontName]);
    localStorage.setItem('fontFamily', fontName);
}

function adjustBrightness(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255))
        .toString(16).slice(1);
}

function resetSettings() {
    localStorage.removeItem('themeColor');
    localStorage.removeItem('fontFamily');
    location.reload();
}

function loadThemeSettings() {
    const savedColor = localStorage.getItem('themeColor');
    const savedFont = localStorage.getItem('fontFamily');
    
    if (savedColor) {
        changeTheme(savedColor);
        document.querySelectorAll('.color-option').forEach(opt => {
            if (opt.dataset.color === savedColor) {
                opt.classList.add('active');
            } else {
                opt.classList.remove('active');
            }
        });
    }
    
    if (savedFont) {
        changeFont(savedFont);
        document.querySelectorAll('.font-option').forEach(opt => {
            if (opt.dataset.font === savedFont) {
                opt.classList.add('active');
            } else {
                opt.classList.remove('active');
            }
        });
    }
}

// Navegação
function toggleProfile() {
    const profileSection = document.getElementById('profileSection');
    const isVisible = profileSection.classList.contains('show');
    
    // Esconder todas as seções
    document.querySelectorAll('.container section').forEach(section => {
        section.style.display = 'block';
    });
    
    if (isVisible) {
        profileSection.classList.remove('show');
    } else {
        profileSection.classList.add('show');
        profileSection.scrollIntoView({ behavior: 'smooth' });
    }
}

function toggleAuthForm() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const authTitle = document.getElementById('authTitle');
    const authSubtitle = document.getElementById('authSubtitle');
    const authToggleText = document.getElementById('authToggleText');
    
    if (loginForm.style.display === 'none') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        authTitle.textContent = 'Entrar';
        authSubtitle.textContent = 'Faça login para continuar';
        authToggleText.innerHTML = 'Não tem uma conta? <a href="#" onclick="toggleAuthForm(); return false;">Cadastre-se</a>';
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        authTitle.textContent = 'Criar Conta';
        authSubtitle.textContent = 'Cadastre-se para começar';
        authToggleText.innerHTML = 'Já tem uma conta? <a href="#" onclick="toggleAuthForm(); return false;">Entrar</a>';
    }
}

function showAuthSection() {
    document.getElementById('authSection').classList.add('show');
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('footer').style.display = 'none';
}

function showMainContent() {
    document.getElementById('authSection').classList.remove('show');
    document.getElementById('mainContent').style.display = 'block';
    document.getElementById('footer').style.display = 'block';
}

function showLoading() {
    document.getElementById('loading').classList.add('show');
}

function hideLoading() {
    document.getElementById('loading').classList.remove('show');
}

// Tornar funções globais
window.toggleAuthForm = toggleAuthForm;
window.previewAvatar = previewAvatar;
window.updateProfileAvatar = updateProfileAvatar;
window.toggleProfile = toggleProfile;
window.openSettings = openSettings;
window.closeSettings = closeSettings;
window.changeTheme = changeTheme;
window.changeFont = changeFont;
window.resetSettings = resetSettings;
window.logout = logout;
window.uploadVideo = uploadVideo;
window.uploadGalleryImages = uploadGalleryImages;
window.deleteReview = deleteReview;
