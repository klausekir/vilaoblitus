<?php
/**
 * Migração: Adicionar colunas flip_x, flip_y e shadow (blur, offset_x, offset_y) na tabela hotspots
 */

header('Content-Type: text/html; charset=UTF-8');

require_once '../config.php';

try {
    $pdo = getDBConnection();

    echo "<style>body{font-family:monospace;background:#1a1a2e;color:#e0e0e0;padding:20px;}</style>";
    echo "<h2 style='color:#f0a500;'>🔧 Adicionando Colunas flip_x, flip_y e shadow</h2>";

    $columns = [
        'flip_x' => "ALTER TABLE hotspots ADD COLUMN flip_x TINYINT(1) DEFAULT 0 COMMENT 'Flip horizontal'",
        'flip_y' => "ALTER TABLE hotspots ADD COLUMN flip_y TINYINT(1) DEFAULT 0 COMMENT 'Flip vertical'",
        'shadow_blur' => "ALTER TABLE hotspots ADD COLUMN shadow_blur INT DEFAULT 0 COMMENT 'Desfoque da sombra (px)'",
        'shadow_offset_x' => "ALTER TABLE hotspots ADD COLUMN shadow_offset_x INT DEFAULT 0 COMMENT 'Deslocamento X da sombra (px)'",
        'shadow_offset_y' => "ALTER TABLE hotspots ADD COLUMN shadow_offset_y INT DEFAULT 0 COMMENT 'Deslocamento Y da sombra (px)'"
    ];

    foreach ($columns as $columnName => $sql) {
        try {
            // Verificar se coluna já existe
            $stmt = $pdo->query("SHOW COLUMNS FROM hotspots LIKE '$columnName'");
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
    echo "<br><a href='index.html' style='color:#f0a500;'>← Voltar</a>";

} catch (Exception $e) {
    echo "<p style='color:#f44336;'>❌ Erro fatal: " . $e->getMessage() . "</p>";
}
