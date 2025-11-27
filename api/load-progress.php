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

    // Get game progress
    $stmt = $pdo->prepare("
        SELECT current_location, visited_locations, collected_items,
               solved_puzzles, inventory, has_key, game_completed, updated_at
        FROM game_progress
        WHERE user_id = ?
    ");
    $stmt->execute([$userId]);
    $progress = $stmt->fetch();

    if (!$progress) {
        // Initialize progress if not exists
        $stmt = $pdo->prepare("
            INSERT INTO game_progress (user_id, current_location, visited_locations, collected_items, solved_puzzles, inventory)
            VALUES (?, 'floresta', '[]', '[]', '[]', '{}')
        ");
        $stmt->execute([$userId]);

        $progress = [
            'current_location' => 'floresta',
            'visited_locations' => '[]',
            'collected_items' => '[]',
            'solved_puzzles' => '[]',
            'inventory' => '{}',
            'has_key' => false,
            'game_completed' => false,
            'updated_at' => date('Y-m-d H:i:s')
        ];
    }

    // Decode JSON fields
    sendResponse(true, [
        'current_location' => $progress['current_location'],
        'visited_locations' => json_decode($progress['visited_locations'], true),
        'collected_items' => json_decode($progress['collected_items'], true),
        'solved_puzzles' => json_decode($progress['solved_puzzles'], true),
        'inventory' => json_decode($progress['inventory'], true),
        'has_key' => (bool)$progress['has_key'],
        'game_completed' => (bool)$progress['game_completed'],
        'updated_at' => $progress['updated_at']
    ], 'Progress loaded successfully');

} catch (PDOException $e) {
    error_log($e->getMessage());
    sendResponse(false, [], 'Failed to load progress');
}
