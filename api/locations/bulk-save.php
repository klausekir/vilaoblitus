<?php
/**
 * API: Bulk Save - Salva TODAS as localizações de uma vez
 * Muito mais rápido que salvar uma por uma
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Desabilitar cache
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

require_once '../config.php';

// Get database connection
$pdo = getDBConnection();

// Get raw input
$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);

if (!$input || !isset($input['locations'])) {
    error_log("❌ BULK SAVE - JSON inválido ou sem locations");
    sendResponse(false, null, 'Invalid data. Expected locations array.', 400);
}

$locations = $input['locations'];
$order = $input['order'] ?? [];
$totalLocations = count($locations);

try {
    // Start transaction - tudo ou nada!
    $pdo->beginTransaction();

    $successCount = 0;
    $hotspotCount = 0;
    $itemCount = 0;
    $puzzleCount = 0;
    $wallCount = 0;

    // Prepared statements (reutilizáveis)
    $locationStmt = $pdo->prepare("
        INSERT INTO locations (id, name, description, background_image, display_order, is_final_scene, credits, transition_video, dramatic_messages, dramatic_message_duration)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            description = VALUES(description),
            background_image = VALUES(background_image),
            display_order = VALUES(display_order),
            is_final_scene = VALUES(is_final_scene),
            credits = VALUES(credits),
            transition_video = VALUES(transition_video),
            dramatic_messages = VALUES(dramatic_messages),
            dramatic_message_duration = VALUES(dramatic_message_duration),
            updated_at = CURRENT_TIMESTAMP
    ");

    $deleteHotspotsStmt = $pdo->prepare("DELETE FROM hotspots WHERE location_id = ?");

    $hotspotStmt = $pdo->prepare("
        INSERT INTO hotspots
        (location_id, type, x, y, width, height, corners, label, description, target_location, item_id, is_display_item, is_decorative, display_image, rotation, rotate_x, rotate_y, scale_x, scale_y, skew_x, skew_y, flip_x, flip_y, opacity, shadow_blur, shadow_offset_x, shadow_offset_y, arrow_direction, zoom_direction, waypoints)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    $itemStmt = $pdo->prepare("
        INSERT INTO items (id, name, description, image, type)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            description = VALUES(description),
            image = VALUES(image),
            type = VALUES(type),
            updated_at = CURRENT_TIMESTAMP
    ");

    $puzzleUpsertStmt = $pdo->prepare("
        INSERT INTO location_puzzles (location_id, puzzle_id, puzzle_data)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
            puzzle_id = VALUES(puzzle_id),
            puzzle_data = VALUES(puzzle_data),
            updated_at = CURRENT_TIMESTAMP
    ");

    $puzzleDeleteStmt = $pdo->prepare("
        DELETE FROM location_puzzles
        WHERE location_id = ?
    ");

    $deleteWallsStmt = $pdo->prepare("DELETE FROM destructible_walls WHERE location_id = ?");

    $wallStmt = $pdo->prepare("
        INSERT INTO destructible_walls
        (location_id, wall_id, x, y, width, height, image, required_item)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");

    // Processar todas as localizações
    foreach ($locations as $loc) {
        $locationId = $loc['id'];
        $name = $loc['name'] ?? '';
        $description = $loc['description'] ?? '';
        $backgroundImage = $loc['background_image'] ?? '';
        $isFinalScene = isset($loc['is_final_scene']) ? (int)$loc['is_final_scene'] : 0;
        $credits = !empty($loc['credits']) ? json_encode($loc['credits'], JSON_UNESCAPED_UNICODE) : null;
        $transitionVideo = !empty($loc['transition_video']) ? $loc['transition_video'] : null;
        $dramaticMessages = !empty($loc['dramatic_messages']) ? $loc['dramatic_messages'] : null;
        $dramaticMessageDuration = !empty($loc['dramatic_message_duration']) ? (int)$loc['dramatic_message_duration'] : null;

        // Get display order from the order array
        $displayOrder = array_search($locationId, $order);
        if ($displayOrder === false) {
            $displayOrder = 999; // Default order if not found
        }


        if (empty($locationId) || empty($name)) {
            continue;
        }

        // Insert/Update location
        $locationStmt->execute([$locationId, $name, $description, $backgroundImage, $displayOrder, $isFinalScene, $credits, $transitionVideo, $dramaticMessages, $dramaticMessageDuration]);
        $successCount++;

        // Delete old hotspots
        $deleteHotspotsStmt->execute([$locationId]);

        // Insert new hotspots
        if (!empty($loc['hotspots'])) {
            foreach ($loc['hotspots'] as $hotspot) {
                $type = $hotspot['type'] ?? 'navigation';
                $x = $hotspot['x'] ?? 0;
                $y = $hotspot['y'] ?? 0;
                $width = $hotspot['width'] ?? 10;
                $height = $hotspot['height'] ?? 10;
                $label = $hotspot['label'] ?? null;
                $description = $hotspot['description'] ?? null;
                $targetLocation = $hotspot['target_location'] ?? null;
                $itemId = $hotspot['item_id'] ?? null;

                // Se é hotspot de item, garantir que o item existe na tabela items
                if ($type === 'item' && $itemId) {
                    $itemImage = $hotspot['item_image'] ?? '';  // Pegar imagem do hotspot

                    $itemStmt->execute([
                        $itemId,
                        $label ?: $itemId,
                        $description ?: '',
                        $itemImage,  // ✅ Usar imagem do item
                        'collectible' // type padrão
                    ]);
                    $itemCount++;
                }

                $hotspotStmt->execute([
                    $locationId,
                    $type,
                    $x,
                    $y,
                    $width,
                    $height,
                    $hotspot['corners'] ?? null,
                    $label,
                    $description,
                    $targetLocation,
                    $itemId,
                    $hotspot['is_display_item'] ?? 0,
                    $hotspot['is_decorative'] ?? 0,  // ✅ CORRIGIDO!
                    $hotspot['display_image'] ?? null,
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
                    !empty($hotspot['waypoints']) ? json_encode($hotspot['waypoints'], JSON_UNESCAPED_UNICODE) : null
                ]);
                $hotspotCount++;
            }
        }

        // Handle puzzle data
        if (!empty($loc['puzzle'])) {
            $puzzle = $loc['puzzle'];
            $puzzleId = $puzzle['id'] ?? ($locationId . '_puzzle');

            // Ensure we do not duplicate the id inside data if already there
            $puzzleData = $puzzle;
            $puzzleData['id'] = $puzzleId;

            $encodedPuzzle = json_encode($puzzleData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            if ($encodedPuzzle === false) {
                throw new RuntimeException('Failed to encode puzzle data for location ' . $locationId . ': ' . json_last_error_msg());
            }

            $puzzleUpsertStmt->execute([
                $locationId,
                $puzzleId,
                $encodedPuzzle
            ]);
            $puzzleCount++;
        } else {
            // Remove puzzle if not present in payload
            $puzzleDeleteStmt->execute([$locationId]);
        }

        // Handle destructible walls
        $deleteWallsStmt->execute([$locationId]);
        
        if (!empty($loc['destructible_walls'])) {
            foreach ($loc['destructible_walls'] as $wall) {
                $wallId = $wall['id'] ?? ('wall_' . uniqid());
                $x = $wall['x'] ?? 0;
                $y = $wall['y'] ?? 0;
                $width = $wall['width'] ?? 10;
                $height = $wall['height'] ?? 20;
                $image = $wall['image'] ?? null;
                $requiredItem = $wall['requiredItem'] ?? 'gun';

                $wallStmt->execute([
                    $locationId,
                    $wallId,
                    $x,
                    $y,
                    $width,
                    $height,
                    $image,
                    $requiredItem
                ]);
                $wallCount++;
            }
        }
    }

    // Commit tudo de uma vez!
    $pdo->commit();

    sendResponse(true, [
        'locations' => $successCount,
        'hotspots' => $hotspotCount,
        'items' => $itemCount,
        'puzzles' => $puzzleCount,
        'walls' => $wallCount
    ], "Saved $successCount locations, $hotspotCount hotspots, $itemCount items, $puzzleCount enigmas e $wallCount paredes com sucesso");

} catch (Exception $e) {
    // Rollback em caso de erro
    $pdo->rollBack();
    error_log("❌ BULK SAVE - Erro: " . $e->getMessage());
    sendResponse(false, null, 'Database error: ' . $e->getMessage(), 500);
}
