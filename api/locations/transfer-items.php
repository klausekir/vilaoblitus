<?php
/**
 * API: Transfer items between locations
 * Moves item hotspots from one location to another
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Disable cache
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

require_once '../config.php';

// Get database connection
$pdo = getDBConnection();

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

// Validate required fields
if (!isset($input['from_location']) || !isset($input['to_location'])) {
    sendResponse(false, null, 'from_location and to_location are required', 400);
}

$fromLocation = $input['from_location'];
$toLocation = $input['to_location'];
$itemId = $input['item_id'] ?? null; // Item específico (opcional)

try {
    // Start transaction
    $pdo->beginTransaction();

    if ($itemId) {
        // Transferir apenas UM item específico
        $stmt = $pdo->prepare("
            UPDATE hotspots
            SET location_id = ?
            WHERE location_id = ? AND type = 'item' AND item_id = ?
        ");

        $stmt->execute([$toLocation, $fromLocation, $itemId]);
    } else {
        // Transferir TODOS os itens (comportamento antigo)
        $stmt = $pdo->prepare("
            UPDATE hotspots
            SET location_id = ?
            WHERE location_id = ? AND type = 'item'
        ");

        $stmt->execute([$toLocation, $fromLocation]);
    }

    $affectedRows = $stmt->rowCount();

    if ($affectedRows === 0) {
        $pdo->rollBack();
        sendResponse(false, null, 'No items found to transfer', 404);
    }

    // Commit transaction
    $pdo->commit();

    sendResponse(true, [
        'from_location' => $fromLocation,
        'to_location' => $toLocation,
        'item_id' => $itemId,
        'items_transferred' => $affectedRows
    ], "Successfully transferred $affectedRows item(s)");

} catch (PDOException $e) {
    // Rollback on error
    $pdo->rollBack();
    sendResponse(false, null, 'Database error: ' . $e->getMessage(), 500);
}
