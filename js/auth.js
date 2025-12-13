// ================= AUTHENTICATION FUNCTIONS =================

// Global auth state
let currentUser = null;
let supabase = null;

// Initialize Supabase client
function initSupabase() {
    // Get Supabase URL and key from environment variables or use defaults
    const supabaseUrl = 'https://jtezcpntdqkfgswcbxvq.supabase.co';
    const supabaseKey = 'sb_secret_w71TXnud8xtdxDAK5TQUSQ_vsVKv_nj';
    
    // Check if Supabase is available
    if (typeof window.supabase === 'undefined') {
        console.error('Supabase client not available. Please include the Supabase JS library.');
        return;
    }
    
    supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
    
    // Check for existing session
    checkSession();
    
    // Listen for auth state changes
    if (supabase && supabase.auth && supabase.auth.onAuthStateChange) {
        supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event);
            handleAuthStateChange(event, session);
        });
    }
}

// Check for existing session
async function checkSession() {
    try {
        if (!supabase || !supabase.auth) {
            console.error('Supabase auth not initialized');
            return;
        }
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('Error checking session:', error);
            return;
        }
        
        if (session) {
            currentUser = session.user;
            updateUIForAuthState();
        }
    } catch (error) {
        console.error('Error checking session:', error);
    }
}

// Handle auth state changes
function handleAuthStateChange(event, session) {
    if (event === 'SIGNED_IN') {
        currentUser = session.user;
        updateUIForAuthState();
        closeAuthModal();
    } else if (event === 'SIGNED_OUT') {
        currentUser = null;
        updateUIForAuthState();
    }
}

// Update UI based on auth state
function updateUIForAuthState() {
    const authButtons = document.getElementById('authButtons');
    
    if (!authButtons) {
        console.warn('Auth buttons container not found');
        return;
    }
    
    if (currentUser) {
        // User is logged in
        authButtons.innerHTML = `
            <span style="color:#10b981;font-weight:600">👤 ${currentUser.email}</span>
            <button class="btn btn-primary" onclick="signOut()">Cerrar Sesión</button>
        `;
    } else {
        // User is not logged in
        authButtons.innerHTML = `
            <button class="btn" onclick="showAuthModal('login')">Iniciar Sesión</button>
            <button class="btn btn-primary" onclick="showAuthModal('signup')">Registrarse</button>
        `;
    }
}

// Show auth modal
function showAuthModal(mode = 'login') {
    const modal = document.getElementById('authModal');
    
    if (!modal) {
        console.error('Auth modal not found');
        return;
    }
    
    const title = document.getElementById('authModalTitle');
    const submitBtn = document.getElementById('authSubmitBtn');
    const nameGroup = document.getElementById('authNameGroup');
    const toggleText = document.getElementById('authToggleText');
    const errorElement = document.getElementById('authError');
    
    // Clear previous errors
    if (errorElement) errorElement.textContent = '';
    
    if (title) title.textContent = mode === 'login' ? 'Iniciar Sesión' : 'Registrarse';
    if (submitBtn) {
        submitBtn.textContent = mode === 'login' ? 'Iniciar Sesión' : 'Registrarse';
        submitBtn.onclick = mode === 'login' ? handleLogin : handleSignup;
    }
    if (nameGroup) nameGroup.style.display = mode === 'login' ? 'none' : 'block';
    if (toggleText) {
        toggleText.innerHTML = mode === 'login' ?
            '¿No tienes cuenta? <a href="#" onclick="showAuthModal(\'signup\')" style="color:var(--primary-color);cursor:pointer">Regístrate</a>' :
            '¿Ya tienes cuenta? <a href="#" onclick="showAuthModal(\'login\')" style="color:var(--primary-color);cursor:pointer">Inicia Sesión</a>';
    }
    
    modal.style.display = 'flex';
}

// Close auth modal
function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.style.display = 'none';
    
    // Clear form
    const emailInput = document.getElementById('authEmail');
    const passwordInput = document.getElementById('authPassword');
    const nameInput = document.getElementById('authName');
    const errorElement = document.getElementById('authError');
    
    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';
    if (nameInput) nameInput.value = '';
    if (errorElement) errorElement.textContent = '';
}

// Handle login
async function handleLogin() {
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const errorElement = document.getElementById('authError');
    
    if (!email || !password) {
        if (errorElement) errorElement.textContent = 'Por favor completa todos los campos';
        return;
    }
    
    try {
        if (!supabase || !supabase.auth) {
            console.error('Supabase auth not initialized');
            if (errorElement) errorElement.textContent = 'Error de autenticación: Supabase no inicializado';
            return;
        }
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            if (errorElement) errorElement.textContent = error.message;
            console.error('Login error:', error);
        }
    } catch (error) {
        if (errorElement) errorElement.textContent = 'Error al iniciar sesión: ' + error.message;
        console.error('Unexpected login error:', error);
    }
}

// Handle signup
async function handleSignup() {
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const name = document.getElementById('authName').value;
    const errorElement = document.getElementById('authError');
    
    if (!email || !password || !name) {
        if (errorElement) errorElement.textContent = 'Por favor completa todos los campos';
        return;
    }
    
    if (password.length < 6) {
        if (errorElement) errorElement.textContent = 'La contraseña debe tener al menos 6 caracteres';
        return;
    }
    
    try {
        if (!supabase || !supabase.auth) {
            console.error('Supabase auth not initialized');
            if (errorElement) errorElement.textContent = 'Error de autenticación: Supabase no inicializado';
            return;
        }
        
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: name,
                    email: email
                }
            }
        });
        
        if (error) {
            if (errorElement) errorElement.textContent = error.message;
            console.error('Signup error:', error);
        } else {
            // Show success message
            if (errorElement) errorElement.textContent = '';
            alert('Registro exitoso! Por favor revisa tu correo para confirmar tu cuenta.');
            showAuthModal('login');
        }
    } catch (error) {
        if (errorElement) errorElement.textContent = 'Error al registrar: ' + error.message;
        console.error('Unexpected signup error:', error);
    }
}

// Sign out
async function signOut() {
    try {
        if (!supabase || !supabase.auth) {
            console.error('Supabase auth not initialized');
            return;
        }
        
        const { error } = await supabase.auth.signOut();
        
        if (error) {
            console.error('Error signing out:', error);
        } else {
            currentUser = null;
            updateUIForAuthState();
        }
    } catch (error) {
        console.error('Unexpected sign out error:', error);
    }
}

// Get current user
function getCurrentUser() {
    return currentUser;
}

// Check if user is authenticated
function isAuthenticated() {
    return currentUser !== null;
}

// Initialize auth when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initSupabase();
});