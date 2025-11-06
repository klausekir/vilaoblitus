<?php
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

// Validate session
$session = validateSession($sessionToken);
if (!$session) {
    http_response_code(401);
    sendResponse(false, [], 'Invalid or expired session');
}

try {
    $pdo = getDBConnection();

    // Update game progress
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
        $session['user_id']
    ]);

    sendResponse(true, [], 'Progress saved successfully');

} catch (PDOException $e) {
    error_log($e->getMessage());
    sendResponse(false, [], 'Failed to save progress');
}
