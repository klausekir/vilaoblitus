<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    sendResponse(false, [], 'Method not allowed');
}

// Check if registration is enabled
try {
    $pdo = getDBConnection();
    $stmt = $pdo->prepare("SELECT setting_value FROM game_settings WHERE setting_key = 'registration_enabled'");
    $stmt->execute();
    $result = $stmt->fetch();

    if ($result && ($result['setting_value'] === 'false' || $result['setting_value'] === '0')) {
        http_response_code(403);
        sendResponse(false, [], 'Cadastro de novos usuários está temporariamente desabilitado.');
    }
} catch (PDOException $e) {
    // If setting doesn't exist or error, allow registration (fail-safe)
    error_log("Error checking registration status: " . $e->getMessage());
}

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

$username = trim($input['username'] ?? '');
$email = trim($input['email'] ?? '');
$password = $input['password'] ?? '';

// Validation
if (empty($username) || empty($email) || empty($password)) {
    sendResponse(false, [], 'Todos os campos são obrigatórios');
}

if (strlen($username) < 3 || strlen($username) > 50) {
    sendResponse(false, [], 'Nome de usuário deve ter entre 3 e 50 caracteres');
}

// Validate username format (only letters, numbers, and underscore)
if (!preg_match('/^[a-zA-Z0-9_]+$/', $username)) {
    sendResponse(false, [], 'Nome de usuário deve conter apenas letras, números e underscore (_)');
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    sendResponse(false, [], 'Formato de email inválido');
}

if (strlen($password) < PASSWORD_MIN_LENGTH) {
    sendResponse(false, [], 'Senha deve ter no mínimo ' . PASSWORD_MIN_LENGTH . ' caracteres');
}

// Check if username or email already exists
try {
    $pdo = getDBConnection();

    $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
    $stmt->execute([$username, $email]);

    if ($stmt->fetch()) {
        sendResponse(false, [], 'Nome de usuário ou email já cadastrado');
    }

    // Hash password
    $passwordHash = password_hash($password, PASSWORD_ARGON2ID);

    // Insert user
    $stmt = $pdo->prepare("
        INSERT INTO users (username, email, password_hash)
        VALUES (?, ?, ?)
    ");
    $stmt->execute([$username, $email, $passwordHash]);

    $userId = $pdo->lastInsertId();

    // Initialize game progress
    $stmt = $pdo->prepare("
        INSERT INTO game_progress (user_id, current_location, visited_locations, collected_items, solved_puzzles, inventory)
        VALUES (?, 'floresta', '[]', '[]', '[]', '{}')
    ");
    $stmt->execute([$userId]);

    // Create session token
    $sessionToken = generateSessionToken();
    $expiresAt = date('Y-m-d H:i:s', time() + SESSION_DURATION);

    $stmt = $pdo->prepare("
        INSERT INTO user_sessions (user_id, session_token, expires_at)
        VALUES (?, ?, ?)
    ");
    $stmt->execute([$userId, $sessionToken, $expiresAt]);

    sendResponse(true, [
        'user_id' => $userId,
        'username' => $username,
        'email' => $email,
        'is_admin' => false,
        'session_token' => $sessionToken
    ], 'Conta criada com sucesso');

} catch (PDOException $e) {
    error_log($e->getMessage());
    sendResponse(false, [], 'Falha ao criar conta. Tente novamente.');
}
