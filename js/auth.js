// Authentication Handler
// Vila Abandonada Game

const API_BASE_URL = 'api/'; // Change this to your Hostinger domain when deploying

// DOM Elements
const loginForm = document.getElementById('loginFormElement');
const registerForm = document.getElementById('registerFormElement');
const loginDiv = document.getElementById('loginForm');
const registerDiv = document.getElementById('registerForm');
const showRegisterBtn = document.getElementById('showRegister');
const showLoginBtn = document.getElementById('showLogin');
const loginMessage = document.getElementById('loginMessage');
const registerMessage = document.getElementById('registerMessage');

// Switch between login and register forms
showRegisterBtn.addEventListener('click', (e) => {
    e.preventDefault();
    loginDiv.style.display = 'none';
    registerDiv.style.display = 'block';
    clearMessages();
});

showLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    registerDiv.style.display = 'none';
    loginDiv.style.display = 'block';
    clearMessages();
});

// Clear all messages
function clearMessages() {
    loginMessage.textContent = '';
    loginMessage.className = 'form-message';
    registerMessage.textContent = '';
    registerMessage.className = 'form-message';
}

// Show message
function showMessage(element, message, isError = false) {
    element.textContent = message;
    element.className = 'form-message ' + (isError ? 'error' : 'success');
}

// Handle Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessages();

    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!username || !password) {
        showMessage(loginMessage, 'Por favor, preencha todos os campos', true);
        return;
    }

    try {
        const response = await fetch(API_BASE_URL + 'login.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            // Save session data
            localStorage.setItem('session_token', data.data.session_token);
            localStorage.setItem('user_id', data.data.user_id);
            localStorage.setItem('username', data.data.username);

            showMessage(loginMessage, 'Login realizado! Carregando jogo...', false);

            // Redirect to game
            setTimeout(() => {
                window.location.href = 'game.html';
            }, 1000);
        } else {
            showMessage(loginMessage, data.message || 'Erro ao fazer login', true);
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage(loginMessage, 'Erro de conexão. Verifique sua internet.', true);
    }
});

// Handle Registration
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessages();

    const username = document.getElementById('registerUsername').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

    // Validation
    if (!username || !email || !password || !passwordConfirm) {
        showMessage(registerMessage, 'Por favor, preencha todos os campos', true);
        return;
    }

    if (username.length < 3) {
        showMessage(registerMessage, 'O usuário deve ter pelo menos 3 caracteres', true);
        return;
    }

    if (password.length < 6) {
        showMessage(registerMessage, 'A senha deve ter pelo menos 6 caracteres', true);
        return;
    }

    if (password !== passwordConfirm) {
        showMessage(registerMessage, 'As senhas não coincidem', true);
        return;
    }

    try {
        const response = await fetch(API_BASE_URL + 'register.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (data.success) {
            // Save session data
            localStorage.setItem('session_token', data.data.session_token);
            localStorage.setItem('user_id', data.data.user_id);
            localStorage.setItem('username', data.data.username);

            showMessage(registerMessage, 'Conta criada! Carregando jogo...', false);

            // Redirect to game
            setTimeout(() => {
                window.location.href = 'game.html';
            }, 1000);
        } else {
            showMessage(registerMessage, data.message || 'Erro ao criar conta', true);
        }
    } catch (error) {
        console.error('Registration error:', error);
        showMessage(registerMessage, 'Erro de conexão. Verifique sua internet.', true);
    }
});

// Check if already logged in
window.addEventListener('DOMContentLoaded', () => {
    const sessionToken = localStorage.getItem('session_token');
    if (sessionToken) {
        // Validate session with backend (optional, can be done on game.html)
        window.location.href = 'game.html';
    }
});
