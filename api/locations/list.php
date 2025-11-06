<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

// Step 1: Check if config file exists
if (!file_exists(__DIR__ . '/../config.php')) {
    sendResponse(false, null, 'Diagnostic: config.php not found.', 500);
}
require_once '../config.php';

// Step 2: Attempt to get DB connection
$pdo = null;
try {
    $pdo = getDBConnection();
} catch (Exception $e) {
    sendResponse(false, null, 'Diagnostic: getDBConnection() failed. Error: ' . $e->getMessage(), 500);
}

if ($pdo === null) {
    sendResponse(false, null, 'Diagnostic: PDO connection is null after getDBConnection().', 500);
}

// Step 3: Check 'locations' table
try {
    $stmt = $pdo->query("SELECT id FROM locations LIMIT 1");
    $stmt->fetch();
} catch (PDOException $e) {
    sendResponse(false, null, 'Diagnostic: Failed to query \'locations\' table. Error: ' . $e->getMessage(), 500);
}

// Step 4: Check 'hotspots' table
try {
    $stmt = $pdo->query("SELECT id FROM hotspots LIMIT 1");
    $stmt->fetch();
} catch (PDOException $e) {
    sendResponse(false, null, 'Diagnostic: Failed to query \'hotspots\' table. Error: ' . $e->getMessage(), 500);
}

// Step 5: Check 'connections' table
try {
    $stmt = $pdo->query("SELECT id FROM connections LIMIT 1");
    $stmt->fetch();
} catch (PDOException $e) {
    sendResponse(false, null, 'Diagnostic: Failed to query \'connections\' table. Error: ' . $e->getMessage(), 500);
}

// If all checks pass, run the original code
try {
    // Get all locations
    $stmt = $pdo->query("
        SELECT
            id,
            name,
            description,
            background_image,
            created_at,
            updated_at
        FROM locations
        ORDER BY display_order ASC, name ASC
    ");

    $locations = $stmt->fetchAll(PDO::FETCH_ASSOC);
    error_log("📋 LIST API - Encontradas " . count($locations) . " localizações no banco");

    // Prepare puzzle statement
    $puzzleStmt = $pdo->prepare("
        SELECT puzzle_id, puzzle_data
        FROM location_puzzles
        WHERE location_id = ?
        LIMIT 1
    ");

    // For each location, get its hotspots
    foreach ($locations as &$location) {
        $hotspotStmt = $pdo->prepare("
            SELECT
                h.id,
                h.type,
                h.x,
                h.y,
                h.width,
                h.height,
                h.label,
                h.description,
                h.target_location,
                h.item_id,
                h.interaction_data,
                h.rotation,
                h.rotate_x,
                h.rotate_y,
                h.scale_x,
                h.scale_y,
                h.skew_x,
                h.skew_y,
                h.flip_x,
                h.flip_y,
                h.opacity,
                h.shadow_blur,
                h.shadow_offset_x,
                h.shadow_offset_y,
                i.image as item_image
            FROM hotspots h
            LEFT JOIN items i ON h.item_id = i.id AND h.type = 'item'
            WHERE h.location_id = ?
            ORDER BY h.type, h.id
        ");
        $hotspotStmt->execute([$location['id']]);
        $location['hotspots'] = $hotspotStmt->fetchAll(PDO::FETCH_ASSOC);
        error_log("  └─ Localização {$location['id']}: " . count($location['hotspots']) . " hotspots");

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

        // Load puzzle data if exists
        $puzzleStmt->execute([$location['id']]);
        $puzzleRow = $puzzleStmt->fetch(PDO::FETCH_ASSOC);

        if ($puzzleRow) {
            $puzzleData = json_decode($puzzleRow['puzzle_data'], true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($puzzleData)) {
                $puzzleData['id'] = $puzzleRow['puzzle_id'];
                $location['puzzle'] = $puzzleData;
            } else {
                error_log("⚠️ LIST API - Falha ao decodificar puzzle_data para location {$location['id']}: " . json_last_error_msg());
            }
        }
    }

    // Get all connections
    $connStmt = $pdo->query("
        SELECT from_location, to_location
        FROM connections
    ");
    $connections = $connStmt->fetchAll(PDO::FETCH_ASSOC);

    // Success response
    error_log("✅ LIST API - Retornando " . count($locations) . " localizações com sucesso");
    sendResponse(true, [
        'locations' => $locations,
        'connections' => $connections,
        'count' => count($locations)
    ], 'Locations loaded successfully');

} catch (PDOException $e) {
    sendResponse(false, null, 'Diagnostic: Error during final data retrieval. Error: ' . $e->getMessage(), 500);
}
