<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'config.php';

try {
    // Conectar ao banco
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

    if ($conn->connect_error) {
        throw new Exception("Erro de conexão: " . $conn->connect_error);
    }

    $conn->set_charset("utf8mb4");

    // Buscar configuração de cadastro
    $stmt = $conn->prepare("
        SELECT setting_value
        FROM game_settings
        WHERE setting_key = 'registration_enabled'
    ");

    $stmt->execute();
    $result = $stmt->get_result();

    $enabled = true; // Default: enabled if setting doesn't exist

    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
        $enabled = $row['setting_value'] === 'true' || $row['setting_value'] === '1';
    }

    $stmt->close();
    $conn->close();

    echo json_encode([
        'success' => true,
        'enabled' => $enabled
    ]);

} catch (Exception $e) {
    error_log("Erro em check-registration-status.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erro ao verificar status do cadastro',
        'enabled' => true // Fail-safe: allow registration on error
    ]);
}
?>
