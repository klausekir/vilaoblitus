<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vila Abandonada - Login</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: url('images/capa.png') center center / cover no-repeat fixed;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            color: #fff;
            position: relative;
        }

        body::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(26, 26, 46, 0.85);
            z-index: 0;
        }

        body > * {
            position: relative;
            z-index: 1;
        }

        .container {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 40px;
            width: 100%;
            max-width: 420px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .logo {
            text-align: center;
            margin-bottom: 30px;
        }

        .logo h1 {
            font-size: 28px;
            margin-bottom: 5px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .logo p {
            font-size: 14px;
            color: rgba(255, 255, 255, 0.6);
        }

        .tabs {
            display: flex;
            margin-bottom: 30px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
            padding: 5px;
        }

        .tab {
            flex: 1;
            padding: 12px;
            text-align: center;
            cursor: pointer;
            border-radius: 8px;
            transition: all 0.3s ease;
            font-weight: 500;
        }

        .tab.active {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }

        .tab:not(.active):hover {
            background: rgba(255, 255, 255, 0.1);
        }

        .form-container {
            display: none;
        }

        .form-container.active {
            display: block;
            animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .form-group {
            margin-bottom: 20px;
        }

        label {
            display: block;
            margin-bottom: 8px;
            font-size: 14px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.8);
        }

        input {
            width: 100%;
            padding: 14px 16px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.05);
            color: #fff;
            font-size: 15px;
            transition: all 0.3s ease;
        }

        input:focus {
            outline: none;
            border-color: #667eea;
            background: rgba(255, 255, 255, 0.08);
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        input::placeholder {
            color: rgba(255, 255, 255, 0.3);
        }

        input.invalid {
            border-color: #f44336 !important;
        }

        input.valid {
            border-color: #4caf50 !important;
        }

        .input-hint {
            font-size: 12px;
            margin-top: 5px;
            opacity: 0.7;
        }

        .input-hint.error {
            color: #f44336;
        }

        .input-hint.success {
            color: #4caf50;
        }

        .password-input-wrapper {
            position: relative;
        }

        .password-input-wrapper input {
            padding-right: 45px;
        }

        .toggle-password {
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            cursor: pointer;
            color: rgba(255, 255, 255, 0.5);
            font-size: 18px;
            user-select: none;
            transition: color 0.3s ease;
        }

        .toggle-password:hover {
            color: rgba(255, 255, 255, 0.8);
        }

        .btn {
            width: 100%;
            padding: 14px;
            border: none;
            border-radius: 10px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #fff;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-top: 10px;
        }

        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }

        .btn:active {
            transform: translateY(0);
        }

        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }

        .message {
            padding: 12px 16px;
            border-radius: 10px;
            margin-bottom: 20px;
            font-size: 14px;
            display: none;
            animation: slideDown 0.3s ease;
        }

        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .message.show {
            display: block;
        }

        .message.success {
            background: rgba(76, 175, 80, 0.2);
            border: 1px solid rgba(76, 175, 80, 0.4);
            color: #4caf50;
        }

        .message.error {
            background: rgba(244, 67, 54, 0.2);
            border: 1px solid rgba(244, 67, 54, 0.4);
            color: #f44336;
        }

        .loading {
            display: none;
            text-align: center;
            padding: 20px;
        }

        .loading.show {
            display: block;
        }

        .spinner {
            border: 3px solid rgba(255, 255, 255, 0.1);
            border-top: 3px solid #667eea;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 0.8s linear infinite;
            margin: 0 auto;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <h1>&#127962;&#65039; Vila Abandonada</h1>
            <p>Point & Click Adventure Game</p>
        </div>

        <div class="tabs">
            <div class="tab active" onclick="switchTab('login')">Login</div>
            <div class="tab" onclick="switchTab('register')">Cadastro</div>
        </div>

        <div id="message" class="message"></div>
        <div id="loading" class="loading">
            <div class="spinner"></div>
            <p style="margin-top: 10px; color: rgba(255, 255, 255, 0.6);">Carregando...</p>
        </div>

        <!-- Login Form -->
        <div id="login-form" class="form-container active">
            <form onsubmit="handleLogin(event)">
                <div class="form-group">
                    <label for="login-username">Usuário ou Email</label>
                    <input type="text" id="login-username" placeholder="Digite seu usuário ou email" required>
                </div>
                <div class="form-group">
                    <label for="login-password">Senha</label>
                    <div class="password-input-wrapper">
                        <input type="password" id="login-password" placeholder="Digite sua senha" required>
                        <span class="toggle-password" onclick="togglePasswordVisibility('login-password', this)">👁️</span>
                    </div>
                </div>
                <button type="submit" class="btn">Entrar</button>
                <div style="text-align: center; margin-top: 15px;">
                    <a href="forgot-password.html" style="color: rgba(255,255,255,0.7); text-decoration: none; font-size: 14px; transition: color 0.3s;" onmouseover="this.style.color='#667eea'" onmouseout="this.style.color='rgba(255,255,255,0.7)'">Esqueci minha senha</a>
                </div>
            </form>
        </div>

        <!-- Register Form -->
        <div id="register-form" class="form-container">
            <form onsubmit="handleRegister(event)">
                <div class="form-group">
                    <label for="register-username">Usuário</label>
                    <input type="text" id="register-username" placeholder="Escolha um nome de usuário" required minlength="3" maxlength="50" pattern="[a-zA-Z0-9_]+" title="Apenas letras, números e underscore (_)">
                    <div id="username-hint" class="input-hint" style="color: rgba(255, 255, 255, 0.5);">Apenas letras, números e underscore (_)</div>
                </div>
                <div class="form-group">
                    <label for="register-email">Email</label>
                    <input type="email" id="register-email" placeholder="seu@email.com" required>
                    <div id="email-hint" class="input-hint" style="color: rgba(255, 255, 255, 0.5);">Digite um email válido</div>
                </div>
                <div class="form-group">
                    <label for="register-password">Senha</label>
                    <div class="password-input-wrapper">
                        <input type="password" id="register-password" placeholder="Mínimo 6 caracteres" required minlength="6">
                        <span class="toggle-password" onclick="togglePasswordVisibility('register-password', this)">👁️</span>
                    </div>
                    <div id="password-hint" class="input-hint" style="color: rgba(255, 255, 255, 0.5);">Mínimo 6 caracteres</div>
                </div>
                <button type="submit" class="btn">Criar Conta</button>
            </form>
        </div>
    </div>

    <script>
        // Check if user is already logged in
        if (localStorage.getItem('session_token')) {
            const isAdmin = localStorage.getItem('is_admin') === 'true';
            window.location.href = isAdmin ? 'admin-panel.html' : 'game-phaser.html';
        }

        // Check if registration is enabled
        async function checkRegistrationStatus() {
            try {
                const response = await fetch('api/check-registration-status.php');
                const data = await response.json();

                if (data.success && !data.enabled) {
                    // Disable registration tab
                    const registerTab = document.querySelectorAll('.tab')[1]; // Second tab is register
                    const registerForm = document.getElementById('register-form');

                    registerTab.style.opacity = '0.5';
                    registerTab.style.cursor = 'not-allowed';
                    registerTab.onclick = function(e) {
                        e.stopPropagation();
                        showMessage('Cadastro temporariamente desabilitado.', 'error');
                    };

                    // Add notice to register form
                    if (registerForm) {
                        const notice = document.createElement('div');
                        notice.className = 'message error show';
                        notice.textContent = 'Cadastro de novos usuários está temporariamente desabilitado.';
                        notice.style.marginBottom = '20px';
                        registerForm.insertBefore(notice, registerForm.firstChild);
                    }
                }
            } catch (error) {
                console.error('Error checking registration status:', error);
                // On error, allow registration (fail-safe)
            }
        }

        // Check registration status on page load
        checkRegistrationStatus();

        // Real-time username validation
        const usernameInput = document.getElementById('register-username');
        const usernameHint = document.getElementById('username-hint');

        if (usernameInput && usernameHint) {
            usernameInput.addEventListener('input', function() {
                const username = this.value;
                const usernameRegex = /^[a-zA-Z0-9_]+$/;

                if (username.length === 0) {
                    // Empty - show default hint
                    this.classList.remove('valid', 'invalid');
                    usernameHint.textContent = 'Apenas letras, números e underscore (_)';
                    usernameHint.className = 'input-hint';
                    usernameHint.style.color = 'rgba(255, 255, 255, 0.5)';
                } else if (username.length < 3) {
                    // Too short
                    this.classList.remove('valid');
                    this.classList.add('invalid');
                    usernameHint.textContent = 'Mínimo 3 caracteres';
                    usernameHint.className = 'input-hint error';
                } else if (!usernameRegex.test(username)) {
                    // Invalid characters
                    this.classList.remove('valid');
                    this.classList.add('invalid');
                    usernameHint.textContent = 'Apenas letras, números e underscore (_)';
                    usernameHint.className = 'input-hint error';
                } else {
                    // Valid
                    this.classList.remove('invalid');
                    this.classList.add('valid');
                    usernameHint.textContent = '✓ Nome de usuário válido';
                    usernameHint.className = 'input-hint success';
                }
            });
        }

        // Real-time email validation
        const emailInput = document.getElementById('register-email');
        const emailHint = document.getElementById('email-hint');

        if (emailInput && emailHint) {
            emailInput.addEventListener('input', function() {
                const email = this.value;
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

                if (email.length === 0) {
                    // Empty - show default hint
                    this.classList.remove('valid', 'invalid');
                    emailHint.textContent = 'Digite um email válido';
                    emailHint.className = 'input-hint';
                    emailHint.style.color = 'rgba(255, 255, 255, 0.5)';
                } else if (!emailRegex.test(email)) {
                    // Invalid email
                    this.classList.remove('valid');
                    this.classList.add('invalid');
                    emailHint.textContent = 'Formato de email inválido';
                    emailHint.className = 'input-hint error';
                } else {
                    // Valid
                    this.classList.remove('invalid');
                    this.classList.add('valid');
                    emailHint.textContent = '✓ Email válido';
                    emailHint.className = 'input-hint success';
                }
            });
        }

        // Real-time password validation
        const passwordInput = document.getElementById('register-password');
        const passwordHint = document.getElementById('password-hint');

        if (passwordInput && passwordHint) {
            passwordInput.addEventListener('input', function() {
                const password = this.value;

                if (password.length === 0) {
                    // Empty - show default hint
                    this.classList.remove('valid', 'invalid');
                    passwordHint.textContent = 'Mínimo 6 caracteres';
                    passwordHint.className = 'input-hint';
                    passwordHint.style.color = 'rgba(255, 255, 255, 0.5)';
                } else if (password.length < 6) {
                    // Too short
                    this.classList.remove('valid');
                    this.classList.add('invalid');
                    passwordHint.textContent = `${password.length}/6 caracteres`;
                    passwordHint.className = 'input-hint error';
                } else {
                    // Valid
                    this.classList.remove('invalid');
                    this.classList.add('valid');
                    passwordHint.textContent = '✓ Senha válida';
                    passwordHint.className = 'input-hint success';
                }
            });
        }

        // Add back button
        const container = document.querySelector('.container');
        const backBtn = document.createElement('div');
        backBtn.style.cssText = 'text-align: center; margin-top: 20px;';
        backBtn.innerHTML = '<a href="index.html" style="color: rgba(255,255,255,0.6); text-decoration: none; font-size: 14px; transition: color 0.3s;" onmouseover="this.style.color=\'rgba(255,255,255,0.9)\'" onmouseout="this.style.color=\'rgba(255,255,255,0.6)\'">← Voltar para a página inicial</a>';
        container.appendChild(backBtn);

        function switchTab(tab) {
            // Update tabs
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            event.target.classList.add('active');

            // Update forms
            document.querySelectorAll('.form-container').forEach(f => f.classList.remove('active'));
            document.getElementById(tab + '-form').classList.add('active');

            // Clear message
            hideMessage();
        }

        function togglePasswordVisibility(inputId, iconElement) {
            const input = document.getElementById(inputId);
            if (input.type === 'password') {
                input.type = 'text';
                iconElement.textContent = '👁️‍🗨️'; // Eye with speech bubble (closed eye)
            } else {
                input.type = 'password';
                iconElement.textContent = '👁️'; // Open eye
            }
        }

        function showMessage(text, type) {
            const msgEl = document.getElementById('message');
            msgEl.textContent = text;
            msgEl.className = 'message ' + type + ' show';
        }

        function hideMessage() {
            document.getElementById('message').className = 'message';
        }

        function showLoading() {
            document.getElementById('loading').classList.add('show');
            document.querySelectorAll('.btn').forEach(btn => btn.disabled = true);
        }

        function hideLoading() {
            document.getElementById('loading').classList.remove('show');
            document.querySelectorAll('.btn').forEach(btn => btn.disabled = false);
        }

        async function handleLogin(e) {
            e.preventDefault();
            hideMessage();
            showLoading();

            const username = document.getElementById('login-username').value;
            const password = document.getElementById('login-password').value;

            try {
                const response = await fetch('api/login.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (data.success) {
                    // Save session data
                    localStorage.setItem('session_token', data.data.session_token);
                    localStorage.setItem('user_id', data.data.user_id);
                    localStorage.setItem('username', data.data.username);
                    localStorage.setItem('email', data.data.email);
                    localStorage.setItem('is_admin', data.data.is_admin);

                    // Redirect based on user type
                    const redirectUrl = data.data.is_admin ? 'admin-panel.html' : 'game-phaser.html';
                    const message = data.data.is_admin ? 'Login Admin realizado! Redirecionando...' : 'Login realizado! Redirecionando...';

                    showMessage(message, 'success');
                    setTimeout(() => {
                        window.location.href = redirectUrl;
                    }, 1000);
                } else {
                    showMessage(data.message || 'Erro ao fazer login', 'error');
                    hideLoading();
                }
            } catch (error) {
                showMessage('Erro de conexão. Verifique se o servidor está rodando.', 'error');
                hideLoading();
            }
        }

        async function handleRegister(e) {
            e.preventDefault();
            hideMessage();

            const username = document.getElementById('register-username').value.trim();
            const email = document.getElementById('register-email').value.trim();
            const password = document.getElementById('register-password').value;

            // Validate username format
            const usernameRegex = /^[a-zA-Z0-9_]+$/;
            if (!usernameRegex.test(username)) {
                showMessage('Nome de usuário deve conter apenas letras, números e underscore (_)', 'error');
                return;
            }

            // Validate username length
            if (username.length < 3 || username.length > 50) {
                showMessage('Nome de usuário deve ter entre 3 e 50 caracteres', 'error');
                return;
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showMessage('Email inválido', 'error');
                return;
            }

            // Validate password length
            if (password.length < 6) {
                showMessage('Senha deve ter no mínimo 6 caracteres', 'error');
                return;
            }

            showLoading();

            try {
                const response = await fetch('api/register.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password })
                });

                const data = await response.json();

                if (data.success) {
                    // Save session data
                    localStorage.setItem('session_token', data.data.session_token);
                    localStorage.setItem('user_id', data.data.user_id);
                    localStorage.setItem('username', data.data.username);
                    localStorage.setItem('email', data.data.email);
                    localStorage.setItem('is_admin', data.data.is_admin);

                    showMessage('Conta criada! Redirecionando...', 'success');
                    setTimeout(() => {
                        window.location.href = 'game-phaser.html';
                    }, 1000);
                } else {
                    showMessage(data.message || 'Erro ao criar conta', 'error');
                    hideLoading();
                }
            } catch (error) {
                showMessage('Erro de conexão. Verifique se o servidor está rodando.', 'error');
                hideLoading();
            }
        }
    </script>
</body>
</html>
