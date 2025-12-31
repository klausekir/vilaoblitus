<?php
/**
 * API: Save/Update location with hotspots
 * Handles complete location data including hotspots
 */

error_log("🔔 SAVE API - Requisição recebida! Method: " . $_SERVER['REQUEST_METHOD']);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, PUT');
header('Access-Control-Allow-Headers: Content-Type');

// Desabilitar cache
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

require_once '../config.php';

// Get database connection
$pdo = getDBConnection();

// Get raw input first for debugging
$rawInput = file_get_contents('php://input');
error_log("📥 SAVE API - Raw input: " . substr($rawInput, 0, 500));

// Get JSON input
$input = json_decode($rawInput, true);

// Debug log
error_log("📥 SAVE API - Parsed JSON: " . json_encode($input));

if (!$input) {
    error_log("❌ SAVE API - JSON inválido ou vazio!");
    sendResponse(false, null, 'Invalid JSON data', 400);
}

// Validate required fields (apenas id e name são obrigatórios)
if (!isset($input['id']) || trim($input['id']) === '') {
    sendResponse(false, null, "Field 'id' is required", 400);
}
if (!isset($input['name']) || trim($input['name']) === '') {
    sendResponse(false, null, "Field 'name' is required", 400);
}

$locationId = $input['id'];
$name = $input['name'];
$description = $input['description'] ?? '';
$backgroundImage = $input['background_image'] ?? '';
$hotspots = $input['hotspots'] ?? [];
$userId = $input['user_id'] ?? null; // Optional: track who created/updated

try {
    // Start transaction
    $pdo->beginTransaction();

    // Check if location exists
    $checkStmt = $pdo->prepare("SELECT id FROM locations WHERE id = ?");
    $checkStmt->execute([$locationId]);
    $exists = $checkStmt->fetch();

    if ($exists) {
        // Update existing location
        error_log("✏️ SAVE API - Atualizando localização existente: $locationId");
        $stmt = $pdo->prepare("
            UPDATE locations
            SET name = ?,
                description = ?,
                background_image = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ");
        $stmt->execute([$name, $description, $backgroundImage, $locationId]);
        $message = 'Location updated successfully';
    } else {
        // Insert new location
        error_log("➕ SAVE API - Criando nova localização: $locationId");
        $stmt = $pdo->prepare("
            INSERT INTO locations (id, name, description, background_image, created_by)
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->execute([$locationId, $name, $description, $backgroundImage, $userId]);
        $message = 'Location created successfully';
    }

    // Delete existing hotspots for this location
    $deleteStmt = $pdo->prepare("DELETE FROM hotspots WHERE location_id = ?");
    $deleteStmt->execute([$locationId]);
    error_log("🗑️ SAVE API - Hotspots antigos deletados para: $locationId");

    // Insert new hotspots
    if (!empty($hotspots)) {
        error_log("💾 SAVE API - Salvando " . count($hotspots) . " hotspots para: $locationId");
        $hotspotStmt = $pdo->prepare("
            INSERT INTO hotspots
            (location_id, type, x, y, width, height, label, description, target_location, item_id, is_display_item, is_decorative, display_image, interaction_data, rotation, rotate_x, rotate_y, scale_x, scale_y, skew_x, skew_y, flip_x, flip_y, opacity, shadow_blur, shadow_offset_x, shadow_offset_y, arrow_direction, zoom_direction, corners)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        foreach ($hotspots as $hotspot) {
            $interactionData = null;
            if (isset($hotspot['interaction_data'])) {
                $interactionData = is_string($hotspot['interaction_data'])
                    ? $hotspot['interaction_data']
                    : json_encode($hotspot['interaction_data']);
            }

            $hotspotStmt->execute([
                $locationId,
                $hotspot['type'] ?? 'navigation',
                $hotspot['x'] ?? 0,
                $hotspot['y'] ?? 0,
                $hotspot['width'] ?? 10,
                $hotspot['height'] ?? 10,
                $hotspot['label'] ?? null,
                $hotspot['description'] ?? null,
                $hotspot['target_location'] ?? null,
                $hotspot['item_id'] ?? null,
                $hotspot['is_display_item'] ?? 0,
                $hotspot['is_decorative'] ?? 0,  // ✅ ADICIONADO
                $hotspot['display_image'] ?? null,
                $interactionData,
                $hotspot['rotation'] ?? 0,
                $hotspot['rotate_x'] ?? 0,
                $hotspot['rotate_y'] ?? 0,
                $hotspot['scale_x'] ?? 1,
                $hotspot['scale_y'] ?? 1,
                $hotspot['skew_x'] ?? 0,
                $hotspot['skew_y'] ?? 0,
                $hotspot['flip_x'] ?? 0,
                $hotspot['flip_y'] ?? 0,
                $hotspot['opacity'] ?? 1,
                $hotspot['shadow_blur'] ?? 0,
                $hotspot['shadow_offset_x'] ?? 0,
                $hotspot['shadow_offset_y'] ?? 0,
                $hotspot['arrow_direction'] ?? null,
                $hotspot['zoom_direction'] ?? null,
                $hotspot['corners'] ?? null
            ]);
        }
    }

    // Handle connections if provided
    if (isset($input['connections'])) {
        // Delete old connections from this location
        $deleteConnStmt = $pdo->prepare("DELETE FROM connections WHERE from_location = ?");
        $deleteConnStmt->execute([$locationId]);

        // Insert new connections
        if (!empty($input['connections'])) {
            $connStmt = $pdo->prepare("
                INSERT INTO connections (from_location, to_location)
                VALUES (?, ?)
                ON DUPLICATE KEY UPDATE from_location = from_location
            ");

            foreach ($input['connections'] as $targetLocation) {
                $connStmt->execute([$locationId, $targetLocation]);
            }
        }
    }

    // Commit transaction
    $pdo->commit();
    error_log("✅ SAVE API - Transação commitada com sucesso para: $locationId");

    sendResponse(true, ['id' => $locationId], $message);

} catch (PDOException $e) {
    // Rollback on error
    $pdo->rollBack();
    sendResponse(false, null, 'Database error: ' . $e->getMessage(), 500);
}


