<?php
/**
 * Migração: Adicionar colunas is_final_scene e credits na tabela locations
 */

header('Content-Type: text/html; charset=UTF-8');

require_once '../config.php';

try {
    $pdo = getDBConnection();

    echo "<style>body{font-family:monospace;background:#1a1a2e;color:#e0e0e0;padding:20px;}</style>";
    echo "<h2 style='color:#f0a500;'>🔧 Adicionando Colunas is_final_scene e credits na tabela locations</h2>";

    $columns = [
        'is_final_scene' => "ALTER TABLE locations ADD COLUMN is_final_scene TINYINT(1) DEFAULT 0 COMMENT 'Flag para cena final com créditos Star Wars'",
        'credits' => "ALTER TABLE locations ADD COLUMN credits JSON NULL COMMENT 'Array de créditos para a cena final (texto, fonte, tamanho, cor, peso)'"
    ];

    foreach ($columns as $columnName => $sql) {
        try {
            // Verificar se coluna já existe
            $stmt = $pdo->query("SHOW COLUMNS FROM locations LIKE '$columnName'");
            $exists = $stmt->fetch();

            if ($exists) {
                echo "<p style='color:#ff9800;'>⚠️ Coluna <b>$columnName</b> já existe. Pulando...</p>";
            } else {
                $pdo->exec($sql);
                echo "<p style='color:#4CAF50;'>✅ Coluna <b>$columnName</b> adicionada com sucesso!</p>";
            }
        } catch (PDOException $e) {
            echo "<p style='color:#f44336;'>❌ Erro ao adicionar <b>$columnName</b>: " . $e->getMessage() . "</p>";
        }
    }

    echo "<br><p style='color:#4CAF50;font-weight:bold;'>✅ Migração concluída!</p>";
    echo "<p style='color:#9E9E9E;'>Agora você pode marcar localizações como \"Cena Final\" e configurar créditos estilo Star Wars!</p>";
    echo "<br><a href='../../location-editor-db.html' style='color:#f0a500;text-decoration:none;padding:10px 20px;background:#333;border-radius:5px;display:inline-block;'>← Voltar ao Editor</a>";

} catch (Exception $e) {
    echo "<p style='color:#f44336;'>❌ Erro fatal: " . $e->getMessage() . "</p>";
}
