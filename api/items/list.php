<?php
/**
 * API: List all items
 * Returns all game items
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

require_once '../config.php';

// Get database connection
$pdo = getDBConnection();

try {
    // Get all items
    $stmt = $pdo->query("
        SELECT
            id,
            name,
            description,
            image,
            type,
            created_at,
            updated_at
        FROM items
        ORDER BY name ASC
    ");

    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Success response
    sendResponse(true, [
        'items' => $items,
        'count' => count($items)
    ], 'Items loaded successfully');

} catch (PDOException $e) {
    sendResponse(false, null, 'Database error: ' . $e->getMessage(), 500);
}

function sendResponse($success, $data = null, $message = '', $httpCode = 200) {
    http_response_code($httpCode);
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'message' => $message,
        'timestamp' => time()
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
