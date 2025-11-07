<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
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

    // Buscar todos os inscritos na waitlist
    $stmt = $conn->prepare("
        SELECT
            id,
            name,
            email,
            age,
            city,
            phone,
            book_source,
            notified,
            created_at
        FROM waitlist
        ORDER BY created_at DESC
    ");

    $stmt->execute();
    $result = $stmt->get_result();

    $waitlist = [];
    while ($row = $result->fetch_assoc()) {
        $waitlist[] = [
            'id' => (int)$row['id'],
            'name' => $row['name'],
            'email' => $row['email'],
            'age' => $row['age'] ? (int)$row['age'] : null,
            'city' => $row['city'],
            'phone' => $row['phone'],
            'book_source' => $row['book_source'],
            'notified' => (bool)$row['notified'],
            'created_at' => $row['created_at']
        ];
    }

    $stmt->close();
    $conn->close();

    echo json_encode([
        'success' => true,
        'data' => $waitlist,
        'total' => count($waitlist)
    ]);

} catch (Exception $e) {
    error_log("Erro em admin/waitlist.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erro ao buscar waitlist'
    ]);
}
?>
