<?php
/**
 * Migration Script: Import map.js data to database
 * Run this once to migrate existing data from map.js to MySQL
 *
 * Usage: Access this file via browser or run: php migrate_mapjs.php
 */

header('Content-Type: text/html; charset=utf-8');

require_once 'config.php';

echo "<h1>Map.js Migration Tool</h1>";
echo "<p>This script will import data from js/map.js into the database.</p>";

// Read and parse map.js
$mapJsPath = __DIR__ . '/../js/map.js';

if (!file_exists($mapJsPath)) {
    die("<p style='color:red;'>Error: map.js not found at: $mapJsPath</p>");
}

$mapJsContent = file_get_contents($mapJsPath);

// Extract the GAME_MAP object using regex (case-insensitive)
preg_match('/const\s+(GAME_MAP|gameMap)\s*=\s*(\{.*?\});/si', $mapJsContent, $matches);

if (empty($matches[2])) {
    die("<p style='color:red;'>Error: Could not parse GAME_MAP from map.js</p>");
}

$jsonData = $matches[2];

// Replace single quotes with double quotes
$jsonData = str_replace("'", '"', $jsonData);

// Remove trailing commas before closing braces/brackets
$jsonData = preg_replace('/,\s*([\]}])/s', '$1', $jsonData);

// Try to decode
$gameMap = json_decode($jsonData, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    echo "<p style='color:orange;'>Warning: Could not auto-parse map.js. Manual data entry required.</p>";
    echo "<p>JSON Error: " . json_last_error_msg() . "</p>";
    echo "<p>Please use the location editor to manually create your locations.</p>";
    exit;
}

echo "<h2>Parsed Data:</h2>";
echo "<pre>" . print_r($gameMap, true) . "</pre>";

try {
    $pdo->beginTransaction();

    $locationCount = 0;
    $hotspotCount = 0;
    $connectionCount = 0;

    echo "<h2>Importing Locations...</h2>";

    foreach ($gameMap as $locationId => $locationData) {
        echo "<p>Processing: <strong>$locationId</strong>...";

        // Insert location
        $stmt = $pdo->prepare("
            INSERT INTO locations (id, name, description, background_image)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                description = VALUES(description),
                background_image = VALUES(background_image)
        ");

        $stmt->execute([
            $locationId,
            $locationData['name'] ?? $locationId,
            $locationData['description'] ?? '',
            $locationData['background'] ?? ''
        ]);

        $locationCount++;

        // Insert hotspots
        if (!empty($locationData['hotspots'])) {
            // Delete existing hotspots
            $deleteHotspots = $pdo->prepare("DELETE FROM hotspots WHERE location_id = ?");
            $deleteHotspots->execute([$locationId]);

            $hotspotStmt = $pdo->prepare("
                INSERT INTO hotspots
                (location_id, type, x, y, width, height, label, description, target_location, item_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");

            foreach ($locationData['hotspots'] as $hotspot) {
                // Determine hotspot type
                $type = 'navigation'; // default
                if (!empty($hotspot['item'])) {
                    $type = 'item';
                } elseif (!empty($hotspot['interaction'])) {
                    $type = 'interaction';
                }

                $hotspotStmt->execute([
                    $locationId,
                    $type,
                    $hotspot['x'] ?? 0,
                    $hotspot['y'] ?? 0,
                    $hotspot['width'] ?? 10,
                    $hotspot['height'] ?? 10,
                    $hotspot['label'] ?? null,
                    $hotspot['description'] ?? null,
                    $hotspot['targetLocation'] ?? $hotspot['target'] ?? null,
                    $hotspot['item'] ?? null
                ]);

                $hotspotCount++;
            }
        }

        // Create connections based on hotspots
        if (!empty($locationData['hotspots'])) {
            foreach ($locationData['hotspots'] as $hotspot) {
                $targetLocation = $hotspot['targetLocation'] ?? $hotspot['target'] ?? null;
                if ($targetLocation && isset($gameMap[$targetLocation])) {
                    $connStmt = $pdo->prepare("
                        INSERT IGNORE INTO connections (from_location, to_location)
                        VALUES (?, ?)
                    ");
                    $connStmt->execute([$locationId, $targetLocation]);
                    $connectionCount++;
                }
            }
        }

        echo " <span style='color:green;'>✓ Done</span></p>";
    }

    $pdo->commit();

    echo "<h2 style='color:green;'>✓ Migration Completed Successfully!</h2>";
    echo "<ul>";
    echo "<li><strong>Locations:</strong> $locationCount</li>";
    echo "<li><strong>Hotspots:</strong> $hotspotCount</li>";
    echo "<li><strong>Connections:</strong> $connectionCount</li>";
    echo "</ul>";
    echo "<p><a href='../location-editor.html'>Go to Location Editor</a></p>";
    echo "<p><a href='../game-phaser.html'>Test Game</a></p>";

} catch (PDOException $e) {
    $pdo->rollBack();
    echo "<p style='color:red;'>Error: " . $e->getMessage() . "</p>";
}
