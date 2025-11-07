<?php
/**
 * Script de teste para verificar envio de emails
 * Acesse: /api/test-email.php?to=seu@email.com
 */

require_once 'config.php';
require_once 'email_helper.php';

// Verificar parâmetro 'to'
$toEmail = $_GET['to'] ?? '';

if (empty($toEmail)) {
    die("<h1>❌ Erro</h1><p>Uso: test-email.php?to=seu@email.com</p>");
}

echo "<h1>🧪 Teste de Envio de Email</h1>";
echo "<hr>";

echo "<h2>Configurações SMTP:</h2>";
echo "<ul>";
echo "<li><strong>SMTP_HOST:</strong> " . SMTP_HOST . "</li>";
echo "<li><strong>SMTP_PORT:</strong> " . SMTP_PORT . "</li>";
echo "<li><strong>SMTP_USER:</strong> " . SMTP_USER . "</li>";
echo "<li><strong>SMTP_PASS:</strong> " . (!empty(SMTP_PASS) ? "✅ Configurado (" . strlen(SMTP_PASS) . " caracteres)" : "❌ NÃO CONFIGURADO") . "</li>";
echo "<li><strong>SMTP_SECURE:</strong> " . SMTP_SECURE . "</li>";
echo "<li><strong>EMAIL_FROM:</strong> " . EMAIL_FROM . "</li>";
echo "<li><strong>EMAIL_FROM_NAME:</strong> " . EMAIL_FROM_NAME . "</li>";
echo "</ul>";
echo "<hr>";

if (empty(SMTP_PASS)) {
    echo "<h2>❌ Erro: SMTP_PASS não configurado</h2>";
    echo "<p>Configure a senha SMTP no arquivo <code>api/config.php</code></p>";
    exit;
}

echo "<h2>📧 Enviando email de teste para: <strong>$toEmail</strong></h2>";
echo "<p>Aguarde...</p>";
flush();

try {
    $subject = "Teste de Email - Vila Abandonada";
    $body = '
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
    </head>
    <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px;">
            <h1 style="color: #f0a500;">🏚️ Email de Teste</h1>
            <p>Este é um email de teste do sistema Vila Abandonada.</p>
            <p>Se você recebeu este email, o sistema SMTP está funcionando corretamente!</p>
            <hr>
            <p style="color: #666; font-size: 12px;">
                Data/Hora: ' . date('d/m/Y H:i:s') . '<br>
                Enviado via: ' . SMTP_HOST . ':' . SMTP_PORT . '
            </p>
        </div>
    </body>
    </html>
    ';

    $result = sendEmail($toEmail, 'Teste', $subject, $body);

    echo "<hr>";
    if ($result) {
        echo "<h2>✅ Email enviado com sucesso!</h2>";
        echo "<p>Verifique sua caixa de entrada (e spam).</p>";
    } else {
        echo "<h2>❌ Falha ao enviar email</h2>";
        echo "<p>Verifique os logs do PHP para mais detalhes.</p>";
    }

} catch (Exception $e) {
    echo "<hr>";
    echo "<h2>❌ Exceção capturada</h2>";
    echo "<p>" . htmlspecialchars($e->getMessage()) . "</p>";
}

echo "<hr>";
echo "<h3>📋 Logs (error_log):</h3>";
echo "<p>Os logs detalhados foram gravados no error_log do PHP.</p>";
echo "<p>Verifique o arquivo de log do servidor para ver os detalhes da conexão SMTP.</p>";

echo "<hr>";
echo "<p><a href='?to=$toEmail'>🔄 Tentar novamente</a></p>";
?>
