<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    sendResponse(false, [], 'Method not allowed');
}

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

$sessionToken = $input['session_token'] ?? '';

if (empty($sessionToken)) {
    sendResponse(false, [], 'Session token required');
}

try {
    $pdo = getDBConnection();

    // Delete session
    $stmt = $pdo->prepare("DELETE FROM user_sessions WHERE session_token = ?");
    $stmt->execute([$sessionToken]);

    sendResponse(true, [], 'Logout successful');

} catch (PDOException $e) {
    error_log($e->getMessage());
    sendResponse(false, [], 'Logout failed');
}
