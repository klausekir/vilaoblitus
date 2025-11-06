<?php
/**
 * API: Save/Update item
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, PUT');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config.php';

// Get database connection
$pdo = getDBConnection();

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    sendResponse(false, null, 'Invalid JSON data', 400);
}

// Validate required fields
$requiredFields = ['id', 'name', 'description'];
foreach ($requiredFields as $field) {
    if (empty($input[$field])) {
        sendResponse(false, null, "Field '$field' is required", 400);
    }
}

$itemId = $input['id'];
$name = $input['name'];
$description = $input['description'];
$image = $input['image'] ?? null;
$type = $input['type'] ?? 'collectible';

try {
    // Check if item exists
    $checkStmt = $pdo->prepare("SELECT id FROM items WHERE id = ?");
    $checkStmt->execute([$itemId]);
    $exists = $checkStmt->fetch();

    if ($exists) {
        // Update existing item
        $stmt = $pdo->prepare("
            UPDATE items
            SET name = ?,
                description = ?,
                image = ?,
                type = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ");
        $stmt->execute([$name, $description, $image, $type, $itemId]);
        $message = 'Item updated successfully';
    } else {
        // Insert new item
        $stmt = $pdo->prepare("
            INSERT INTO items (id, name, description, image, type)
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->execute([$itemId, $name, $description, $image, $type]);
        $message = 'Item created successfully';
    }

    sendResponse(true, ['id' => $itemId], $message);

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
