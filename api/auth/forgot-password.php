<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config.php';
require_once '../email_helper.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido']);
    exit;
}

// Get input
$input = json_decode(file_get_contents('php://input'), true);
$email = trim($input['email'] ?? '');

// Validate email
if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Email inválido']);
    exit;
}

try {
    // Connect to database
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

    if ($conn->connect_error) {
        throw new Exception("Erro de conexão: " . $conn->connect_error);
    }

    $conn->set_charset("utf8mb4");

    // Check if user exists
    $stmt = $conn->prepare("SELECT id, username FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        // Don't reveal if email exists or not for security
        echo json_encode([
            'success' => true,
            'message' => 'Se o email existir em nossa base, você receberá um link de reset'
        ]);
        $stmt->close();
        $conn->close();
        exit;
    }

    $user = $result->fetch_assoc();
    $userId = $user['id'];
    $username = $user['username'];
    $stmt->close();

    // Generate secure token
    $token = bin2hex(random_bytes(32)); // 64 character token

    // Set expiration (1 hour from now)
    $expiresAt = date('Y-m-d H:i:s', strtotime('+1 hour'));

    // Delete old unused tokens for this user
    $deleteStmt = $conn->prepare("DELETE FROM password_reset_tokens WHERE user_id = ? AND used = FALSE");
    $deleteStmt->bind_param("i", $userId);
    $deleteStmt->execute();
    $deleteStmt->close();

    // Insert new token
    $insertStmt = $conn->prepare("INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)");
    $insertStmt->bind_param("iss", $userId, $token, $expiresAt);

    if (!$insertStmt->execute()) {
        throw new Exception("Erro ao criar token de reset");
    }

    $insertStmt->close();

    // Send email with reset link
    // O arquivo reset-password.html está na raiz do site, não em /api
    $protocol = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? "https" : "http";
    $host = $_SERVER['HTTP_HOST'];

    // Descobrir o caminho base (remover /api/auth/forgot-password.php)
    $scriptPath = $_SERVER['PHP_SELF']; // Ex: /api/auth/forgot-password.php
    $basePath = dirname(dirname(dirname($scriptPath))); // Remove 3 níveis: forgot-password.php, auth/, api/
    if ($basePath === '/' || $basePath === '\\') {
        $basePath = '';
    }

    $resetLink = $protocol . "://" . $host . $basePath . "/reset-password.html?token=" . $token;

    error_log("🔵 [FORGOT-PASSWORD] Iniciando envio de email de reset");
    error_log("🔵 [FORGOT-PASSWORD] Reset link: " . $resetLink);
    error_log("🔵 [FORGOT-PASSWORD] SMTP_PASS configurado: " . (!empty(SMTP_PASS) ? 'SIM' : 'NÃO'));

    $emailSent = false;
    if (!empty(SMTP_PASS)) {
        try {
            error_log("🔵 [FORGOT-PASSWORD] Chamando sendEmail()...");
            $subject = "Reset de Senha - Vila Abandonada 🏚️";
            $body = getPasswordResetEmailTemplate($username, $resetLink);
            $emailSent = sendEmail($email, $username, $subject, $body);
            error_log("🔵 [FORGOT-PASSWORD] sendEmail() retornou: " . ($emailSent ? 'true' : 'false'));
        } catch (Exception $e) {
            error_log("❌ [FORGOT-PASSWORD] Erro ao enviar email de reset: " . $e->getMessage());
        }
    } else {
        error_log("❌ [FORGOT-PASSWORD] SMTP_PASS não configurado");
    }

    $conn->close();

    echo json_encode([
        'success' => true,
        'message' => 'Se o email existir em nossa base, você receberá um link de reset',
        'email_sent' => $emailSent,
        'debug_link' => (!empty(SMTP_PASS) ? null : $resetLink) // Only in dev
    ]);

} catch (Exception $e) {
    error_log("Erro em forgot-password.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erro ao processar solicitação'
    ]);
}
?>
