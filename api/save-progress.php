<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Desabilitar cache
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    sendResponse(false, [], 'Method not allowed');
}

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

$sessionToken = $input['session_token'] ?? '';
$currentLocation = $input['current_location'] ?? '';
$visitedLocations = $input['visited_locations'] ?? [];
$collectedItems = $input['collected_items'] ?? [];
$solvedPuzzles = $input['solved_puzzles'] ?? [];
$inventory = $input['inventory'] ?? [];
$hasKey = $input['has_key'] ?? false;
$gameCompleted = $input['game_completed'] ?? false;

$userId = 1; // Default user ID for development

// Validate session (optional for development)
if ($sessionToken) {
    $session = validateSession($sessionToken);
    if ($session) {
        $userId = $session['user_id'];
    }
}

try {
    $pdo = getDBConnection();

    // Check if progress exists for this user
    $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM game_progress WHERE user_id = ?");
    $checkStmt->execute([$userId]);
    $exists = $checkStmt->fetchColumn() > 0;

    if ($exists) {
        // Update existing progress
        $stmt = $pdo->prepare("
            UPDATE game_progress
            SET current_location = ?,
                visited_locations = ?,
                collected_items = ?,
                solved_puzzles = ?,
                inventory = ?,
                has_key = ?,
                game_completed = ?,
                updated_at = NOW()
            WHERE user_id = ?
        ");

        $stmt->execute([
            $currentLocation,
            json_encode($visitedLocations),
            json_encode($collectedItems),
            json_encode($solvedPuzzles),
            json_encode($inventory),
            $hasKey ? 1 : 0,
            $gameCompleted ? 1 : 0,
            $userId
        ]);
    } else {
        // Insert new progress
        $stmt = $pdo->prepare("
            INSERT INTO game_progress (user_id, current_location, visited_locations, collected_items, solved_puzzles, inventory, has_key, game_completed)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $stmt->execute([
            $userId,
            $currentLocation,
            json_encode($visitedLocations),
            json_encode($collectedItems),
            json_encode($solvedPuzzles),
            json_encode($inventory),
            $hasKey ? 1 : 0,
            $gameCompleted ? 1 : 0
        ]);
    }

    sendResponse(true, [], 'Progress saved successfully');

} catch (PDOException $e) {
    error_log($e->getMessage());
    sendResponse(false, [], 'Failed to save progress');
}
