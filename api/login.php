<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    sendResponse(false, [], 'Method not allowed');
}

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

$username = trim($input['username'] ?? '');
$password = $input['password'] ?? '';

// Validation
if (empty($username) || empty($password)) {
    sendResponse(false, [], 'Username and password are required');
}

try {
    $pdo = getDBConnection();

    // Get user by username or email
    $stmt = $pdo->prepare("
        SELECT id, username, email, password_hash, is_admin
        FROM users
        WHERE username = ? OR email = ?
    ");
    $stmt->execute([$username, $username]);
    $user = $stmt->fetch();

    if (!$user) {
        sendResponse(false, [], 'Invalid credentials');
    }

    // Verify password
    if (!password_verify($password, $user['password_hash'])) {
        sendResponse(false, [], 'Invalid credentials');
    }

    // Update last login
    $stmt = $pdo->prepare("UPDATE users SET last_login = NOW() WHERE id = ?");
    $stmt->execute([$user['id']]);

    // Clean expired sessions
    $pdo->exec("DELETE FROM user_sessions WHERE expires_at < NOW()");

    // Create new session token
    $sessionToken = generateSessionToken();
    $expiresAt = date('Y-m-d H:i:s', time() + SESSION_DURATION);

    $stmt = $pdo->prepare("
        INSERT INTO user_sessions (user_id, session_token, expires_at)
        VALUES (?, ?, ?)
    ");
    $stmt->execute([$user['id'], $sessionToken, $expiresAt]);

    sendResponse(true, [
        'user_id' => $user['id'],
        'username' => $user['username'],
        'email' => $user['email'],
        'is_admin' => (bool)$user['is_admin'],
        'session_token' => $sessionToken
    ], 'Login successful');

} catch (PDOException $e) {
    error_log($e->getMessage());
    sendResponse(false, [], 'Login failed');
}
