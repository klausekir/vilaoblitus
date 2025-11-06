<?php
/**
 * Migration Script v2: Import game data via browser
 * This script receives JSON data from the browser where map.js is already loaded
 *
 * Usage: Access migrate_ui.html which will call this API
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'config.php';

// Get database connection
$pdo = getDBConnection();

// Get JSON data from POST
$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['locations'])) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Invalid data. Expected locations array.'
    ]);
    exit;
}

$locations = $input['locations'];

try {
    $pdo->beginTransaction();

    $locationCount = 0;
    $hotspotCount = 0;
    $connectionCount = 0;

    foreach ($locations as $locationData) {
        $locationId = $locationData['id'];
        $name = $locationData['name'] ?? $locationId;
        $description = $locationData['description'] ?? '';
        $background = $locationData['background'] ?? $locationData['image'] ?? '';

        // Insert location
        $stmt = $pdo->prepare("
            INSERT INTO locations (id, name, description, background_image)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                description = VALUES(description),
                background_image = VALUES(background_image)
        ");
        $stmt->execute([$locationId, $name, $description, $background]);
        $locationCount++;

        // Delete existing hotspots
        $deleteHotspots = $pdo->prepare("DELETE FROM hotspots WHERE location_id = ?");
        $deleteHotspots->execute([$locationId]);

        // Insert hotspots
        if (!empty($locationData['hotspots'])) {
            $hotspotStmt = $pdo->prepare("
                INSERT INTO hotspots
                (location_id, type, x, y, width, height, label, description, target_location, item_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");

            foreach ($locationData['hotspots'] as $hotspot) {
                // Determine type
                $type = 'navigation';
                $targetLocation = null;
                $itemId = null;

                if (!empty($hotspot['item'])) {
                    $type = 'item';
                    $itemId = $hotspot['item'];
                } elseif (!empty($hotspot['interaction'])) {
                    $type = 'interaction';
                } elseif (!empty($hotspot['targetLocation']) || !empty($hotspot['target'])) {
                    $type = 'navigation';
                    $targetLocation = $hotspot['targetLocation'] ?? $hotspot['target'];
                }

                // Get position from position object or direct properties
                $x = $hotspot['x'] ?? $hotspot['position']['x'] ?? 0;
                $y = $hotspot['y'] ?? $hotspot['position']['y'] ?? 0;
                $width = $hotspot['width'] ?? $hotspot['position']['width'] ?? 10;
                $height = $hotspot['height'] ?? $hotspot['position']['height'] ?? 10;

                $hotspotStmt->execute([
                    $locationId,
                    $type,
                    $x,
                    $y,
                    $width,
                    $height,
                    $hotspot['label'] ?? $hotspot['name'] ?? null,
                    $hotspot['description'] ?? null,
                    $targetLocation,
                    $itemId
                ]);
                $hotspotCount++;

                // Create connection if navigation
                if ($targetLocation) {
                    $connStmt = $pdo->prepare("
                        INSERT IGNORE INTO connections (from_location, to_location)
                        VALUES (?, ?)
                    ");
                    $connStmt->execute([$locationId, $targetLocation]);
                    $connectionCount++;
                }
            }
        }
    }

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Migration completed successfully',
        'stats' => [
            'locations' => $locationCount,
            'hotspots' => $hotspotCount,
            'connections' => $connectionCount
        ]
    ]);

} catch (PDOException $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
