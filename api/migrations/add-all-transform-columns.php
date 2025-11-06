<?php
/**
 * Migration: Add ALL transform columns to hotspots table
 */

require_once '../config.php';

header('Content-Type: text/html; charset=utf-8');

try {
    $pdo = getDBConnection();

    echo "<pre>";
    echo "🔧 Adicionando colunas de transformação na tabela hotspots...\n\n";

    // Get existing columns
    $stmt = $pdo->query("SHOW COLUMNS FROM hotspots");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $existingColumns = array_column($columns, 'Field');

    // Define all transform columns
    $transformColumns = [
        'rotation' => "DECIMAL(10, 2) DEFAULT 0 COMMENT 'Rotação Z (0-360)'",
        'rotate_x' => "DECIMAL(10, 2) DEFAULT 0 COMMENT 'Rotação X (perspectiva 3D)'",
        'rotate_y' => "DECIMAL(10, 2) DEFAULT 0 COMMENT 'Rotação Y (perspectiva 3D)'",
        'scale_x' => "DECIMAL(10, 2) DEFAULT 1 COMMENT 'Escala X'",
        'scale_y' => "DECIMAL(10, 2) DEFAULT 1 COMMENT 'Escala Y'",
        'skew_x' => "DECIMAL(10, 2) DEFAULT 0 COMMENT 'Inclinação X'",
        'skew_y' => "DECIMAL(10, 2) DEFAULT 0 COMMENT 'Inclinação Y'",
        'opacity' => "DECIMAL(3, 2) DEFAULT 1 COMMENT 'Opacidade (0-1)'"
    ];

    $added = 0;
    $skipped = 0;

    foreach ($transformColumns as $columnName => $definition) {
        if (in_array($columnName, $existingColumns)) {
            echo "⏭️  Coluna '$columnName' já existe\n";
            $skipped++;
        } else {
            $sql = "ALTER TABLE hotspots ADD COLUMN $columnName $definition";
            echo "➕ Adicionando coluna '$columnName'... ";

            try {
                $pdo->exec($sql);
                echo "✓ OK\n";
                $added++;
            } catch (PDOException $e) {
                echo "✗ ERRO: " . $e->getMessage() . "\n";
            }
        }
    }

    echo "\n" . str_repeat('-', 50) . "\n";
    echo "✅ Migração concluída!\n";
    echo "   Colunas adicionadas: $added\n";
    echo "   Colunas já existiam: $skipped\n";
    echo "</pre>";

} catch (PDOException $e) {
    echo "<pre style='color: red;'>❌ Erro: " . $e->getMessage() . "</pre>";
}
