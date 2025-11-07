<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config.php';

try {
    $pdo = getDBConnection();

    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (!isset($data['location_id'])) {
        sendResponse(false, null, 'location_id é obrigatório');
    }

    $locationId = $data['location_id'];
    $puzzleData = $data['puzzle_data'] ?? null;

    // Se puzzle_data é null, deletar o puzzle
    if ($puzzleData === null) {
        $stmt = $pdo->prepare("DELETE FROM location_puzzles WHERE location_id = ?");
        $stmt->execute([$locationId]);
        sendResponse(true, null, 'Puzzle removido com sucesso');
    }

    // Validar dados do puzzle
    if (!isset($puzzleData['type'])) {
        sendResponse(false, null, 'Tipo de puzzle é obrigatório');
    }

    // Gerar puzzle_id se não existir
    if (!isset($puzzleData['id'])) {
        $puzzleData['id'] = 'puzzle_' . $locationId . '_' . time();
    }

    $puzzleId = $puzzleData['id'];
    $puzzleDataJson = json_encode($puzzleData);

    // Verificar se já existe puzzle para esta location
    $stmt = $pdo->prepare("SELECT puzzle_id FROM location_puzzles WHERE location_id = ?");
    $stmt->execute([$locationId]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($existing) {
        // Update
        $stmt = $pdo->prepare("
            UPDATE location_puzzles
            SET puzzle_id = ?, puzzle_data = ?, updated_at = CURRENT_TIMESTAMP
            WHERE location_id = ?
        ");
        $stmt->execute([$puzzleId, $puzzleDataJson, $locationId]);
        sendResponse(true, ['puzzle_id' => $puzzleId], 'Puzzle atualizado com sucesso');
    } else {
        // Insert
        $stmt = $pdo->prepare("
            INSERT INTO location_puzzles (location_id, puzzle_id, puzzle_data)
            VALUES (?, ?, ?)
        ");
        $stmt->execute([$locationId, $puzzleId, $puzzleDataJson]);
        sendResponse(true, ['puzzle_id' => $puzzleId], 'Puzzle criado com sucesso');
    }

} catch (PDOException $e) {
    error_log("Erro ao salvar puzzle: " . $e->getMessage());
    sendResponse(false, null, 'Erro ao salvar puzzle: ' . $e->getMessage(), 500);
} catch (Exception $e) {
    error_log("Erro inesperado: " . $e->getMessage());
    sendResponse(false, null, 'Erro inesperado: ' . $e->getMessage(), 500);
}
