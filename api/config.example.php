<?php
// Database Configuration
// COPY THIS FILE TO config.php AND UPDATE WITH YOUR CREDENTIALS

define('DB_HOST', 'localhost'); // Usually 'localhost' on Hostinger
define('DB_NAME', 'vila_abandonada'); // Your database name
define('DB_USER', 'your_db_username'); // Your MySQL username
define('DB_PASS', 'your_db_password'); // Your MySQL password

// Security settings
define('SESSION_DURATION', 86400); // 24 hours in seconds
define('PASSWORD_MIN_LENGTH', 6);

// CORS headers for local development
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database connection function
function getDBConnection() {
    try {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];

        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        return $pdo;
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Database connection failed'
        ]);
        exit();
    }
}

// Generate secure session token
function generateSessionToken() {
    return bin2hex(random_bytes(32));
}

// Validate session token
function validateSession($token) {
    $pdo = getDBConnection();
    $stmt = $pdo->prepare("
        SELECT s.user_id, u.username, u.email
        FROM user_sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.session_token = ? AND s.expires_at > NOW()
    ");
    $stmt->execute([$token]);
    return $stmt->fetch();
}

// Response helper
function sendResponse($success, $data = [], $message = '') {
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data
    ]);
    exit();
}
