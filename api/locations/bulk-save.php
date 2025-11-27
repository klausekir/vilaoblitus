<?php
/**
 * API: Bulk Save - Salva TODAS as localizações de uma vez
 * Muito mais rápido que salvar uma por uma
 */

error_log("🔔 BULK SAVE API - Requisição recebida!");

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

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

error_log("📥 BULK SAVE - Recebendo $totalLocations localizações");
if (!empty($order)) {
    error_log("🔢 Ordem recebida: " . implode(', ', $order));
}

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
        INSERT INTO locations (id, name, description, background_image, display_order)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            description = VALUES(description),
            background_image = VALUES(background_image),
            display_order = VALUES(display_order),
            updated_at = CURRENT_TIMESTAMP
    ");

    $deleteHotspotsStmt = $pdo->prepare("DELETE FROM hotspots WHERE location_id = ?");

    $hotspotStmt = $pdo->prepare("
        INSERT INTO hotspots
        (location_id, type, x, y, width, height, label, description, target_location, item_id, is_display_item, display_image, rotation, rotate_x, rotate_y, scale_x, scale_y, skew_x, skew_y, flip_x, flip_y, opacity, shadow_blur, shadow_offset_x, shadow_offset_y)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        
        // Get display order from the order array
        $displayOrder = array_search($locationId, $order);
        if ($displayOrder === false) {
            $displayOrder = 999; // Default order if not found
        }


        if (empty($locationId) || empty($name)) {
            error_log("⚠️ BULK SAVE - Localização sem id ou name: " . json_encode($loc));
            continue;
        }

        // Insert/Update location
        error_log("📍 Salvando location: ID=$locationId, Name=$name, Description=$description, BG=$backgroundImage, Order=$displayOrder");
        $locationStmt->execute([$locationId, $name, $description, $backgroundImage, $displayOrder]);
        error_log("✅ Location $locationId salvo com sucesso!");
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
                    error_log("📦 Salvando item: ID=$itemId, Nome=$label, Image=$itemImage");

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
                    $label,
                    $description,
                    $targetLocation,
                    $itemId,
                    $hotspot['is_display_item'] ?? 0,
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
                    $hotspot['shadow_offset_y'] ?? 0
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

    error_log("✅ BULK SAVE - Sucesso! $successCount localizações, $hotspotCount hotspots, $itemCount items, $puzzleCount puzzles, $wallCount walls");

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
