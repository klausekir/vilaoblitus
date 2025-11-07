<?php
/**
 * Email Helper usando SMTP do Hostinger
 * Função simplificada para envio de emails
 */

/**
 * Função auxiliar para ler resposta multi-linha do servidor SMTP
 */
function getSmtpResponse($conn) {
    $response = '';
    while ($line = fgets($conn, 515)) {
        $response .= $line;
        // Última linha termina com espaço (não hífen) após o código
        if (substr($line, 3, 1) == ' ') break;
    }
    return trim($response);
}

/**
 * Envia email usando SMTP com autenticação (Hostinger)
 *
 * @param string $to Email do destinatário
 * @param string $toName Nome do destinatário
 * @param string $subject Assunto do email
 * @param string $body Corpo do email (HTML)
 * @return bool True se enviado com sucesso
 */
function sendEmail($to, $toName, $subject, $body) {
    error_log("🔵 [EMAIL] Iniciando envio de email para: $to");
    error_log("🔵 [EMAIL] Assunto: $subject");

    // Verificar se SMTP_PASS está configurado
    if (empty(SMTP_PASS)) {
        error_log("❌ [EMAIL] SMTP_PASS não está configurado!");
        return false;
    }
    error_log("✅ [EMAIL] SMTP_PASS está configurado");

    // Validar email
    if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
        error_log("❌ [EMAIL] Email inválido: $to");
        return false;
    }
    error_log("✅ [EMAIL] Email válido");

    try {
        $smtpServer = (SMTP_SECURE == 'ssl' ? 'ssl://' : '') . SMTP_HOST;
        error_log("🔵 [EMAIL] Conectando a: $smtpServer:" . SMTP_PORT);

        // Conectar ao servidor SMTP
        $smtpConn = @fsockopen(
            $smtpServer,
            SMTP_PORT,
            $errno,
            $errstr,
            30
        );

        if (!$smtpConn) {
            error_log("❌ [EMAIL] Erro ao conectar ao SMTP: $errstr ($errno)");
            return false;
        }
        error_log("✅ [EMAIL] Conectado ao servidor SMTP");

        // Ler resposta inicial
        $response = getSmtpResponse($smtpConn);
        error_log("🔵 [EMAIL] Resposta inicial: " . $response);

        if (substr($response, 0, 3) != '220') {
            error_log("❌ [EMAIL] SMTP erro na conexão: $response");
            fclose($smtpConn);
            return false;
        }

        // EHLO
        $serverName = $_SERVER['SERVER_NAME'] ?? 'localhost';
        fputs($smtpConn, "EHLO $serverName\r\n");
        $response = getSmtpResponse($smtpConn);
        error_log("🔵 [EMAIL] EHLO response: " . $response);

        // AUTH LOGIN
        fputs($smtpConn, "AUTH LOGIN\r\n");
        $response = getSmtpResponse($smtpConn);
        error_log("🔵 [EMAIL] AUTH LOGIN response: " . $response);

        if (substr($response, 0, 3) != '334') {
            error_log("❌ [EMAIL] Servidor não aceitou AUTH LOGIN: $response");
            fclose($smtpConn);
            return false;
        }

        // Username
        fputs($smtpConn, base64_encode(SMTP_USER) . "\r\n");
        $response = getSmtpResponse($smtpConn);
        error_log("🔵 [EMAIL] Username response: " . $response);

        if (substr($response, 0, 3) != '334') {
            error_log("❌ [EMAIL] Username rejeitado: $response");
            fclose($smtpConn);
            return false;
        }

        // Password
        fputs($smtpConn, base64_encode(SMTP_PASS) . "\r\n");
        $response = getSmtpResponse($smtpConn);
        error_log("🔵 [EMAIL] Password response: " . $response);

        if (substr($response, 0, 3) != '235') {
            error_log("❌ [EMAIL] SMTP autenticação falhou: $response");
            error_log("❌ [EMAIL] User: " . SMTP_USER);
            error_log("❌ [EMAIL] Pass length: " . strlen(SMTP_PASS));
            fclose($smtpConn);
            return false;
        }
        error_log("✅ [EMAIL] Autenticação bem-sucedida");

        // MAIL FROM
        fputs($smtpConn, "MAIL FROM: <" . EMAIL_FROM . ">\r\n");
        $response = getSmtpResponse($smtpConn);
        error_log("🔵 [EMAIL] MAIL FROM response: " . $response);

        if (substr($response, 0, 3) != '250') {
            error_log("❌ [EMAIL] MAIL FROM falhou: $response");
            fclose($smtpConn);
            return false;
        }

        // RCPT TO
        fputs($smtpConn, "RCPT TO: <$to>\r\n");
        $response = getSmtpResponse($smtpConn);
        error_log("🔵 [EMAIL] RCPT TO response: " . $response);

        if (substr($response, 0, 3) != '250') {
            error_log("❌ [EMAIL] RCPT TO falhou: $response");
            fclose($smtpConn);
            return false;
        }

        // DATA
        fputs($smtpConn, "DATA\r\n");
        $response = getSmtpResponse($smtpConn);
        error_log("🔵 [EMAIL] DATA response: " . $response);

        if (substr($response, 0, 3) != '354') {
            error_log("❌ [EMAIL] DATA falhou: $response");
            fclose($smtpConn);
            return false;
        }

        // Montar mensagem
        $message = "From: " . EMAIL_FROM_NAME . " <" . EMAIL_FROM . ">\r\n";
        $message .= "To: $toName <$to>\r\n";
        $message .= "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=\r\n";
        $message .= "MIME-Version: 1.0\r\n";
        $message .= "Content-Type: text/html; charset=UTF-8\r\n";
        $message .= "Content-Transfer-Encoding: 8bit\r\n";
        $message .= "\r\n";
        $message .= $body;
        $message .= "\r\n.\r\n";

        error_log("🔵 [EMAIL] Enviando mensagem...");

        // Enviar mensagem
        fputs($smtpConn, $message);
        $response = getSmtpResponse($smtpConn);
        error_log("🔵 [EMAIL] Send response: " . $response);

        // QUIT
        fputs($smtpConn, "QUIT\r\n");
        fclose($smtpConn);

        if (substr($response, 0, 3) == '250') {
            error_log("✅ [EMAIL] Email enviado com sucesso para: $to");
            return true;
        } else {
            error_log("❌ [EMAIL] SMTP erro ao enviar: $response");
            return false;
        }

    } catch (Exception $e) {
        error_log("❌ [EMAIL] Exceção ao enviar email: " . $e->getMessage());
        error_log("❌ [EMAIL] Stack trace: " . $e->getTraceAsString());
        return false;
    }
}

/**
 * Template de email de boas-vindas para waitlist
 */
function getWaitlistEmailTemplate($name) {
    return '
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bem-vindo à Lista de Espera - Vila Abandonada</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #0a0a0a;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%); border: 2px solid #f0a500; border-radius: 16px; overflow: hidden;">

                    <!-- Header -->
                    <tr>
                        <td style="background: rgba(240, 165, 0, 0.1); padding: 30px; text-align: center;">
                            <h1 style="color: #f0a500; margin: 0; font-size: 32px; text-shadow: 0 0 20px rgba(240, 165, 0, 0.5);">
                                🏚️ Vila Abandonada
                            </h1>
                            <p style="color: #999; margin: 10px 0 0 0; font-size: 14px;">
                                Um jogo de aventura e mistério
                            </p>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #f0a500; margin: 0 0 20px 0; font-size: 24px;">
                                Olá, ' . htmlspecialchars($name) . '! 👋
                            </h2>

                            <p style="color: #e0e0e0; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                                Obrigado por se cadastrar na lista de espera do jogo <strong style="color: #f0a500;">Vila Abandonada</strong>!
                            </p>

                            <p style="color: #e0e0e0; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                                Você foi inscrito com sucesso e receberá um email assim que o jogo estiver disponível para jogar.
                            </p>

                            <div style="background: rgba(240, 165, 0, 0.1); border-left: 4px solid #f0a500; padding: 20px; margin: 30px 0; border-radius: 4px;">
                                <p style="color: #f0a500; margin: 0 0 10px 0; font-weight: bold; font-size: 14px;">
                                    📅 LANÇAMENTO PREVISTO
                                </p>
                                <p style="color: #e0e0e0; margin: 0; font-size: 20px; font-weight: bold;">
                                    Dezembro de 2026
                                </p>
                            </div>

                            <p style="color: #999; line-height: 1.6; margin: 0 0 20px 0; font-size: 14px;">
                                Enquanto isso, prepare-se para desvendar os mistérios da Vila Abandonada...
                            </p>

                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="https://explorandoavilaoblitus.kirner.com.br" style="display: inline-block; background: linear-gradient(135deg, #f0a500, #f5c75a); color: #0a0a0a; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                                            Visitar Site
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background: rgba(0, 0, 0, 0.3); padding: 30px; text-align: center; border-top: 1px solid rgba(240, 165, 0, 0.2);">
                            <p style="color: #666; margin: 0 0 10px 0; font-size: 12px;">
                                Este email foi enviado porque você se cadastrou na lista de espera do jogo Vila Abandonada.
                            </p>
                            <p style="color: #666; margin: 0; font-size: 12px;">
                                © 2025 KIRNER BINARIES. Todos os direitos reservados.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    ';
}

/**
 * Template de email de reset de senha
 */
function getPasswordResetEmailTemplate($name, $resetLink) {
    return '
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset de Senha - Vila Abandonada</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #0a0a0a;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%); border: 2px solid #f0a500; border-radius: 16px; overflow: hidden;">

                    <!-- Header -->
                    <tr>
                        <td style="background: rgba(240, 165, 0, 0.1); padding: 30px; text-align: center;">
                            <h1 style="color: #f0a500; margin: 0; font-size: 32px; text-shadow: 0 0 20px rgba(240, 165, 0, 0.5);">
                                🏚️ Vila Abandonada
                            </h1>
                            <p style="color: #999; margin: 10px 0 0 0; font-size: 14px;">
                                Reset de Senha
                            </p>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #f0a500; margin: 0 0 20px 0; font-size: 24px;">
                                Olá, ' . htmlspecialchars($name) . '! 👋
                            </h2>

                            <p style="color: #e0e0e0; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                                Recebemos uma solicitação para resetar a senha da sua conta em <strong style="color: #f0a500;">Vila Abandonada</strong>.
                            </p>

                            <p style="color: #e0e0e0; line-height: 1.6; margin: 0 0 30px 0; font-size: 16px;">
                                Clique no botão abaixo para criar uma nova senha:
                            </p>

                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="' . htmlspecialchars($resetLink) . '" style="display: inline-block; background: linear-gradient(135deg, #f0a500, #f5c75a); color: #0a0a0a; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                                            Resetar Senha
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <div style="background: rgba(240, 165, 0, 0.1); border-left: 4px solid #f0a500; padding: 20px; margin: 30px 0; border-radius: 4px;">
                                <p style="color: #f0a500; margin: 0 0 10px 0; font-weight: bold; font-size: 14px;">
                                    ⏰ IMPORTANTE
                                </p>
                                <p style="color: #e0e0e0; margin: 0; font-size: 14px; line-height: 1.6;">
                                    Este link expira em <strong>1 hora</strong>. Se você não solicitou o reset de senha, ignore este email.
                                </p>
                            </div>

                            <p style="color: #999; line-height: 1.6; margin: 20px 0 0 0; font-size: 13px;">
                                Se o botão não funcionar, copie e cole o link abaixo no seu navegador:
                            </p>
                            <p style="color: #666; line-height: 1.6; margin: 5px 0; font-size: 12px; word-break: break-all;">
                                ' . htmlspecialchars($resetLink) . '
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background: rgba(0, 0, 0, 0.3); padding: 30px; text-align: center; border-top: 1px solid rgba(240, 165, 0, 0.2);">
                            <p style="color: #666; margin: 0 0 10px 0; font-size: 12px;">
                                Este email foi enviado porque alguém solicitou o reset de senha para esta conta.
                            </p>
                            <p style="color: #666; margin: 0; font-size: 12px;">
                                © 2025 KIRNER BINARIES. Todos os direitos reservados.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    ';
}


/**
 * Template de email de lançamento do jogo
 */
function getLaunchEmailTemplate($name) {
    return '
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vila Abandonada Está Disponível!</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #0a0a0a;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%); border: 2px solid #f0a500; border-radius: 16px; overflow: hidden;">
                    <tr>
                        <td style="background: rgba(240, 165, 0, 0.1); padding: 30px; text-align: center;">
                            <h1 style="color: #f0a500; margin: 0; font-size: 36px; text-shadow: 0 0 20px rgba(240, 165, 0, 0.5);">🎮 O JOGO ESTÁ DISPONÍVEL!</h1>
                            <p style="color: #999; margin: 10px 0 0 0; font-size: 16px;">Vila Abandonada</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #f0a500; margin: 0 0 20px 0; font-size: 24px;">Olá, ' . htmlspecialchars($name) . '! 👋</h2>
                            <p style="color: #e0e0e0; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">Estamos muito felizes em anunciar que <strong style="color: #f0a500;">Vila Abandonada</strong> já está disponível para jogar!</p>
                            <p style="color: #e0e0e0; line-height: 1.6; margin: 0 0 30px 0; font-size: 16px;">Você foi um dos primeiros a se inscrever e agora pode começar sua jornada pelos mistérios da vila.</p>
                            <div style="background: rgba(240, 165, 0, 0.15); border: 2px solid #f0a500; padding: 25px; margin: 30px 0; border-radius: 8px; text-align: center;">
                                <p style="color: #f0a500; margin: 0 0 15px 0; font-weight: bold; font-size: 18px;">🏚️ COMECE A JOGAR AGORA</p>
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr><td align="center"><a href="https://explorandoavilaoblitus.kirner.com.br/login.php" style="display: inline-block; background: linear-gradient(135deg, #f0a500, #f5c75a); color: #0a0a0a; padding: 18px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px;">JOGAR AGORA</a></td></tr>
                                </table>
                            </div>
                            <div style="background: rgba(0, 0, 0, 0.3); padding: 20px; margin: 30px 0; border-radius: 8px; border-left: 4px solid #f0a500;">
                                <h3 style="color: #f0a500; margin: 0 0 15px 0; font-size: 18px;">📖 O que te espera:</h3>
                                <ul style="color: #e0e0e0; margin: 0; padding-left: 20px; line-height: 1.8;">
                                    <li>Múltiplos locais para explorar</li>
                                    <li>Enigmas desafiadores e recompensas</li>
                                    <li>Sistema de inventário e combinação de itens</li>
                                    <li>História envolvente e atmosfera misteriosa</li>
                                    <li>Salve seu progresso e continue de onde parou</li>
                                </ul>
                            </div>
                            <p style="color: #999; line-height: 1.6; margin: 20px 0 0 0; font-size: 14px; text-align: center;">Divirta-se explorando os mistérios!<br><strong style="color: #f0a500;">KIRNER BINARIES</strong></p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background: rgba(0, 0, 0, 0.3); padding: 30px; text-align: center; border-top: 1px solid rgba(240, 165, 0, 0.2);">
                            <p style="color: #666; margin: 0 0 10px 0; font-size: 12px;">Você está recebendo este email porque se inscreveu na lista de espera.</p>
                            <p style="color: #666; margin: 0; font-size: 12px;">© 2025 KIRNER BINARIES. Todos os direitos reservados.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    ';
}
