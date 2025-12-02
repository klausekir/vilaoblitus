<?php
/**
 * API: Get a specific location by ID
 * Returns location details with hotspots
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

// Desabilitar cache
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

require_once '../config.php';

// Get database connection
$pdo = getDBConnection();

// Get location ID from query string
$locationId = $_GET['id'] ?? null;

if (!$locationId) {
    sendResponse(false, null, 'Location ID is required', 400);
}

try {
    // Get location
    $stmt = $pdo->prepare("
        SELECT
            id,
            name,
            description,
            background_image,
            is_final_scene,
            credits,
            created_at,
            updated_at
        FROM locations
        WHERE id = ?
    ");
    $stmt->execute([$locationId]);
    $location = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$location) {
        sendResponse(false, null, 'Location not found', 404);
    }

    // Convert credits JSON string to array
    if (!empty($location['credits'])) {
        $location['credits'] = json_decode($location['credits'], true);
    }
    // Convert is_final_scene to boolean
    $location['is_final_scene'] = (bool) $location['is_final_scene'];

    // Get hotspots
    $hotspotStmt = $pdo->prepare("
        SELECT
            id,
            type,
            x,
            y,
            width,
            height,
            label,
            description,
            target_location,
            item_id,
            is_display_item,
            display_image,
            interaction_data
        FROM hotspots
        WHERE location_id = ?
        ORDER BY type, id
    ");
    $hotspotStmt->execute([$locationId]);
    $location['hotspots'] = $hotspotStmt->fetchAll(PDO::FETCH_ASSOC);

    // Convert numeric strings to numbers
    foreach ($location['hotspots'] as &$hotspot) {
        $hotspot['x'] = (float) $hotspot['x'];
        $hotspot['y'] = (float) $hotspot['y'];
        $hotspot['width'] = (float) $hotspot['width'];
        $hotspot['height'] = (float) $hotspot['height'];

        // Parse interaction_data if present
        if ($hotspot['interaction_data']) {
            $hotspot['interaction_data'] = json_decode($hotspot['interaction_data'], true);
        }
    }

    // Success response
    sendResponse(true, $location, 'Location loaded successfully');

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
