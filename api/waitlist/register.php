<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config.php';
require_once '../email_helper.php';

try {
    $pdo = getDBConnection();

    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    // Validar campos obrigatórios
    if (!isset($data['name']) || trim($data['name']) === '') {
        sendResponse(false, null, 'Nome é obrigatório');
    }

    if (!isset($data['email']) || trim($data['email']) === '') {
        sendResponse(false, null, 'Email é obrigatório');
    }

    // Validar formato de email
    $email = filter_var(trim($data['email']), FILTER_VALIDATE_EMAIL);
    if (!$email) {
        sendResponse(false, null, 'Email inválido');
    }

    $name = trim($data['name']);
    $age = isset($data['age']) && is_numeric($data['age']) ? (int)$data['age'] : null;
    $city = isset($data['city']) ? trim($data['city']) : null;
    $phone = isset($data['phone']) ? trim($data['phone']) : null;
    $bookSource = isset($data['book_source']) ? trim($data['book_source']) : null;

    // Verificar se email já existe
    $stmt = $pdo->prepare("SELECT id FROM waitlist WHERE email = ?");
    $stmt->execute([$email]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($existing) {
        sendResponse(false, null, 'Este email já está cadastrado na lista de espera!');
    }

    // Inserir na waitlist
    $stmt = $pdo->prepare("
        INSERT INTO waitlist (name, email, age, city, phone, book_source)
        VALUES (?, ?, ?, ?, ?, ?)
    ");

    $stmt->execute([$name, $email, $age, $city, $phone, $bookSource]);

    // Log para debug
    error_log("✅ Nova inscrição na waitlist: $name ($email)");

    // Enviar email de confirmação
    error_log("🔵 [WAITLIST] Iniciando tentativa de envio de email");
    error_log("🔵 [WAITLIST] SMTP_HOST: " . SMTP_HOST);
    error_log("🔵 [WAITLIST] SMTP_PORT: " . SMTP_PORT);
    error_log("🔵 [WAITLIST] SMTP_USER: " . SMTP_USER);
    error_log("🔵 [WAITLIST] SMTP_PASS configurado: " . (!empty(SMTP_PASS) ? 'SIM' : 'NÃO'));
    error_log("🔵 [WAITLIST] EMAIL_FROM: " . EMAIL_FROM);

    $emailSent = false;
    if (!empty(SMTP_PASS)) {
        try {
            error_log("🔵 [WAITLIST] Chamando sendEmail()...");
            $subject = "Bem-vindo à Lista de Espera - Vila Abandonada 🏚️";
            $body = getWaitlistEmailTemplate($name);
            $emailSent = sendEmail($email, $name, $subject, $body);
            error_log("🔵 [WAITLIST] sendEmail() retornou: " . ($emailSent ? 'true' : 'false'));
        } catch (Exception $e) {
            error_log("❌ [WAITLIST] Erro ao enviar email: " . $e->getMessage());
        }
    } else {
        error_log("❌ [WAITLIST] SMTP_PASS não configurado - email não enviado");
    }

    $message = 'Cadastro realizado com sucesso! ';
    $message .= $emailSent
        ? 'Você receberá um email de confirmação em breve.'
        : 'Você receberá um email quando o jogo estiver disponível.';

    sendResponse(true, [
        'id' => $pdo->lastInsertId(),
        'name' => $name,
        'email' => $email,
        'email_sent' => $emailSent
    ], $message);

} catch (PDOException $e) {
    error_log("❌ Erro ao cadastrar na waitlist: " . $e->getMessage());
    sendResponse(false, null, 'Erro ao processar cadastro. Tente novamente mais tarde.', 500);
} catch (Exception $e) {
    error_log("❌ Erro inesperado: " . $e->getMessage());
    sendResponse(false, null, 'Erro inesperado. Tente novamente mais tarde.', 500);
}
