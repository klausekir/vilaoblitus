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
                    <input type="password" id="login-password" placeholder="Digite sua senha" required>
                </div>
                <button type="submit" class="btn">Entrar</button>
            </form>
        </div>

        <!-- Register Form -->
        <div id="register-form" class="form-container">
            <form onsubmit="handleRegister(event)">
                <div class="form-group">
                    <label for="register-username">Usuário</label>
                    <input type="text" id="register-username" placeholder="Escolha um nome de usuário" required minlength="3" maxlength="50">
                </div>
                <div class="form-group">
                    <label for="register-email">Email</label>
                    <input type="email" id="register-email" placeholder="seu@email.com" required>
                </div>
                <div class="form-group">
                    <label for="register-password">Senha</label>
                    <input type="password" id="register-password" placeholder="Mínimo 6 caracteres" required minlength="6">
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
            showLoading();

            const username = document.getElementById('register-username').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;

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
