<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../config.php';

// Verificar autenticação admin
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? '';

if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Token não fornecido']);
    exit;
}

$token = $matches[1];

// Obter dados do request
$json = file_get_contents('php://input');
$data = json_decode($json, true);

if (!$data || !isset($data['setting_key']) || !isset($data['setting_value'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Parâmetros inválidos']);
    exit;
}

$settingKey = trim($data['setting_key']);
$settingValue = trim($data['setting_value']);

try {
    // Conectar ao banco
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

    if ($conn->connect_error) {
        throw new Exception("Erro de conexão: " . $conn->connect_error);
    }

    $conn->set_charset("utf8mb4");

    // Verificar se o token é válido e se é admin
    $stmt = $conn->prepare("
        SELECT u.id, u.username, u.is_admin
        FROM user_sessions s
        INNER JOIN users u ON s.user_id = u.id
        WHERE s.session_token = ? AND s.expires_at > NOW()
    ");

    $stmt->bind_param("s", $token);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Sessão inválida ou expirada']);
        $stmt->close();
        $conn->close();
        exit;
    }

    $user = $result->fetch_assoc();
    $stmt->close();

    if (!$user['is_admin']) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Acesso negado. Apenas administradores.']);
        $conn->close();
        exit;
    }

    // Atualizar a configuração
    $stmt = $conn->prepare("
        UPDATE game_settings
        SET setting_value = ?, updated_by = ?
        WHERE setting_key = ?
    ");

    $stmt->bind_param("sis", $settingValue, $user['id'], $settingKey);

    if (!$stmt->execute()) {
        throw new Exception("Erro ao atualizar configuração");
    }

    if ($stmt->affected_rows === 0) {
        // Setting doesn't exist, insert it
        $stmt->close();
        $stmt = $conn->prepare("
            INSERT INTO game_settings (setting_key, setting_value, updated_by)
            VALUES (?, ?, ?)
        ");
        $stmt->bind_param("ssi", $settingKey, $settingValue, $user['id']);

        if (!$stmt->execute()) {
            throw new Exception("Erro ao criar configuração");
        }
    }

    $stmt->close();
    $conn->close();

    echo json_encode([
        'success' => true,
        'message' => 'Configuração atualizada com sucesso',
        'data' => [
            'setting_key' => $settingKey,
            'setting_value' => $settingValue
        ]
    ]);

} catch (Exception $e) {
    error_log("Erro em admin/update-settings.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erro ao atualizar configuração'
    ]);
}
?>
