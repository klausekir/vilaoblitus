<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: DELETE, POST');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

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

// Get input
$input = json_decode(file_get_contents('php://input'), true);
$userId = $input['id'] ?? null;

if (!$userId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'ID não fornecido']);
    exit;
}

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

    // Buscar dados do inscrito antes de deletar (para log)
    $stmt = $conn->prepare("SELECT name, email FROM waitlist WHERE id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Inscrito não encontrado']);
        $stmt->close();
        $conn->close();
        exit;
    }

    $waitlistUser = $result->fetch_assoc();
    $stmt->close();

    // Deletar inscrito
    $stmt = $conn->prepare("DELETE FROM waitlist WHERE id = ?");
    $stmt->bind_param("i", $userId);

    if (!$stmt->execute()) {
        throw new Exception("Erro ao deletar inscrito");
    }

    $stmt->close();
    $conn->close();

    // Log
    error_log("✅ [ADMIN] Inscrito deletado da waitlist: {$waitlistUser['name']} ({$waitlistUser['email']}) por {$user['username']}");

    echo json_encode([
        'success' => true,
        'message' => 'Inscrito removido com sucesso'
    ]);

} catch (Exception $e) {
    error_log("Erro em admin/delete-waitlist.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erro ao deletar inscrito'
    ]);
}
?>
