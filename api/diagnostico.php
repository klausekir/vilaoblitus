<?php
/**
 * Diagnóstico de Configuração
 * Verifica se o sistema está configurado corretamente
 */

// Enable error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Diagnóstico - Vila Abandonada</title>
    <style>
        body {
            font-family: 'Courier New', monospace;
            background: #1a1a2e;
            color: #e0e0e0;
            padding: 20px;
            line-height: 1.6;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            background: rgba(255,255,255,0.05);
            padding: 30px;
            border-radius: 10px;
        }
        h1 { color: #f0a500; }
        h2 { color: #2196F3; margin-top: 30px; }
        .test {
            padding: 15px;
            margin: 10px 0;
            border-radius: 5px;
            background: rgba(0,0,0,0.3);
        }
        .success { border-left: 4px solid #4CAF50; }
        .error { border-left: 4px solid #f44336; }
        .warning { border-left: 4px solid #ff9800; }
        .label { color: #999; font-size: 12px; }
        pre {
            background: #000;
            padding: 10px;
            border-radius: 4px;
            overflow: auto;
            font-size: 11px;
        }
        .status-ok { color: #4CAF50; font-weight: bold; }
        .status-fail { color: #f44336; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔧 Diagnóstico do Sistema</h1>
        <p>Esta página verifica se o sistema está configurado corretamente.</p>

        <?php
        $allOk = true;

        // Test 1: Check if config.php exists
        echo "<h2>1. Verificar arquivo config.php</h2>";
        if (file_exists('config.php')) {
            echo "<div class='test success'>";
            echo "<span class='status-ok'>✓</span> Arquivo config.php encontrado<br>";
            echo "<span class='label'>Caminho: " . __DIR__ . "/config.php</span>";
            echo "</div>";
        } else {
            echo "<div class='test error'>";
            echo "<span class='status-fail'>✗</span> Arquivo config.php NÃO encontrado<br>";
            echo "<span class='label'>Caminho esperado: " . __DIR__ . "/config.php</span><br>";
            echo "<strong>Solução:</strong> Crie o arquivo api/config.php com as credenciais do banco.";
            echo "</div>";
            $allOk = false;
        }

        // Test 2: Try to include config.php
        echo "<h2>2. Carregar config.php</h2>";
        try {
            require_once 'config.php';
            echo "<div class='test success'>";
            echo "<span class='status-ok'>✓</span> config.php carregado sem erros<br>";
            echo "<span class='label'>Constantes definidas:</span><br>";
            echo "- DB_HOST: " . (defined('DB_HOST') ? DB_HOST : 'NÃO DEFINIDO') . "<br>";
            echo "- DB_NAME: " . (defined('DB_NAME') ? DB_NAME : 'NÃO DEFINIDO') . "<br>";
            echo "- DB_USER: " . (defined('DB_USER') ? DB_USER : 'NÃO DEFINIDO') . "<br>";
            echo "- DB_PASS: " . (defined('DB_PASS') ? '***' : 'NÃO DEFINIDO') . "<br>";
            echo "</div>";
        } catch (Exception $e) {
            echo "<div class='test error'>";
            echo "<span class='status-fail'>✗</span> Erro ao carregar config.php<br>";
            echo "<pre>" . htmlspecialchars($e->getMessage()) . "</pre>";
            echo "</div>";
            $allOk = false;
        }

        // Test 3: Try to connect to database
        echo "<h2>3. Conectar ao Banco de Dados</h2>";
        if (defined('DB_HOST') && defined('DB_NAME') && defined('DB_USER') && defined('DB_PASS')) {
            try {
                $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
                $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
                ]);

                echo "<div class='test success'>";
                echo "<span class='status-ok'>✓</span> Conexão com banco de dados estabelecida<br>";
                echo "<span class='label'>Host: " . DB_HOST . "</span><br>";
                echo "<span class='label'>Database: " . DB_NAME . "</span><br>";
                echo "<span class='label'>User: " . DB_USER . "</span>";
                echo "</div>";

                // Test 4: Check if tables exist
                echo "<h2>4. Verificar Tabelas</h2>";
                $tables = ['users', 'locations', 'hotspots', 'items', 'connections'];
                $missingTables = [];

                foreach ($tables as $table) {
                    $stmt = $pdo->query("SHOW TABLES LIKE '$table'");
                    if ($stmt->rowCount() > 0) {
                        echo "<div class='test success'>";
                        echo "<span class='status-ok'>✓</span> Tabela <strong>$table</strong> existe";

                        // Count rows
                        try {
                            $count = $pdo->query("SELECT COUNT(*) FROM $table")->fetchColumn();
                            echo " <span class='label'>($count registros)</span>";
                        } catch (Exception $e) {
                            echo " <span class='label'>(erro ao contar)</span>";
                        }

                        echo "</div>";
                    } else {
                        echo "<div class='test error'>";
                        echo "<span class='status-fail'>✗</span> Tabela <strong>$table</strong> NÃO existe";
                        echo "</div>";
                        $missingTables[] = $table;
                        $allOk = false;
                    }
                }

                if (count($missingTables) > 0) {
                    echo "<div class='test warning'>";
                    echo "<strong>⚠️ Ação necessária:</strong><br>";
                    echo "Execute o arquivo <strong>database.sql</strong> no phpMyAdmin para criar as tabelas faltantes:<br>";
                    echo "- " . implode("<br>- ", $missingTables);
                    echo "</div>";
                }

                // Test 5: Check if locations table has data
                echo "<h2>5. Verificar Dados</h2>";
                try {
                    $count = $pdo->query("SELECT COUNT(*) FROM locations")->fetchColumn();

                    if ($count > 0) {
                        echo "<div class='test success'>";
                        echo "<span class='status-ok'>✓</span> Banco contém <strong>$count localizações</strong>";
                        echo "</div>";
                    } else {
                        echo "<div class='test warning'>";
                        echo "<span class='status-fail'>⚠️</span> Nenhuma localização encontrada no banco<br>";
                        echo "<strong>Ação necessária:</strong> Execute a migração para importar dados do map.js<br>";
                        echo "<a href='../migrate-ui.html' style='color: #4CAF50;'>→ Ir para migrate-ui.html</a>";
                        echo "</div>";
                    }
                } catch (Exception $e) {
                    echo "<div class='test error'>";
                    echo "<span class='status-fail'>✗</span> Erro ao verificar dados<br>";
                    echo "<pre>" . htmlspecialchars($e->getMessage()) . "</pre>";
                    echo "</div>";
                }

            } catch (PDOException $e) {
                echo "<div class='test error'>";
                echo "<span class='status-fail'>✗</span> Erro ao conectar ao banco de dados<br>";
                echo "<pre>" . htmlspecialchars($e->getMessage()) . "</pre>";
                echo "<br><strong>Possíveis causas:</strong><br>";
                echo "- Credenciais incorretas em config.php<br>";
                echo "- Banco de dados não existe<br>";
                echo "- Servidor MySQL não está rodando";
                echo "</div>";
                $allOk = false;
            }
        } else {
            echo "<div class='test error'>";
            echo "<span class='status-fail'>✗</span> Constantes do banco não definidas no config.php";
            echo "</div>";
            $allOk = false;
        }

        // Summary
        echo "<h2>📊 Resumo</h2>";
        if ($allOk) {
            echo "<div class='test success'>";
            echo "<h3 style='color: #4CAF50; margin: 0;'>✓ Sistema configurado corretamente!</h3>";
            echo "<p style='margin: 10px 0 0 0;'>Todas as verificações passaram. O sistema está pronto para uso.</p>";
            echo "<p><a href='../location-editor-v2.html' style='color: #4CAF50;'>→ Abrir Editor v2</a></p>";
            echo "</div>";
        } else {
            echo "<div class='test error'>";
            echo "<h3 style='color: #f44336; margin: 0;'>✗ Sistema precisa de configuração</h3>";
            echo "<p style='margin: 10px 0 0 0;'>Corrija os erros acima antes de usar o sistema.</p>";
            echo "</div>";
        }
        ?>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid rgba(255,255,255,0.1);">
        <p style="text-align: center; color: #666; font-size: 12px;">
            Vila Abandonada - Sistema v2.0<br>
            <a href="../test-api.html" style="color: #2196F3;">Teste de APIs</a> |
            <a href="../migrate-ui.html" style="color: #2196F3;">Migração</a> |
            <a href="../admin-panel.html" style="color: #2196F3;">Painel Admin</a>
        </p>
    </div>
</body>
</html>
