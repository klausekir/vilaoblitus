<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    sendResponse(false, [], 'Method not allowed');
}

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

$username = trim($input['username'] ?? '');
$email = trim($input['email'] ?? '');
$password = $input['password'] ?? '';

// Validation
if (empty($username) || empty($email) || empty($password)) {
    sendResponse(false, [], 'All fields are required');
}

if (strlen($username) < 3 || strlen($username) > 50) {
    sendResponse(false, [], 'Username must be between 3 and 50 characters');
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    sendResponse(false, [], 'Invalid email format');
}

if (strlen($password) < PASSWORD_MIN_LENGTH) {
    sendResponse(false, [], 'Password must be at least ' . PASSWORD_MIN_LENGTH . ' characters');
}

// Check if username or email already exists
try {
    $pdo = getDBConnection();

    $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
    $stmt->execute([$username, $email]);

    if ($stmt->fetch()) {
        sendResponse(false, [], 'Username or email already exists');
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
    ], 'Account created successfully');

} catch (PDOException $e) {
    error_log($e->getMessage());
    sendResponse(false, [], 'Registration failed');
}
