<?php
/**
 * Check which transform columns exist in hotspots table
 */

require_once '../config.php';

header('Content-Type: text/html; charset=utf-8');

try {
    $pdo = getDBConnection();

    echo "<pre>";
    echo "Verificando colunas de transformação na tabela hotspots...\n\n";

    // Get all columns
    $stmt = $pdo->query("SHOW COLUMNS FROM hotspots");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $transformColumns = [
        'rotation', 'rotate_x', 'rotate_y',
        'scale_x', 'scale_y',
        'skew_x', 'skew_y',
        'opacity'
    ];

    $existingColumns = array_column($columns, 'Field');

    echo "Colunas de transformação:\n";
    echo str_repeat('-', 50) . "\n";

    foreach ($transformColumns as $col) {
        $exists = in_array($col, $existingColumns);
        $status = $exists ? '✓ EXISTE' : '✗ FALTA';
        $color = $exists ? 'green' : 'red';
        echo sprintf("%-15s %s\n", $col, $status);
    }

    echo "\n" . str_repeat('-', 50) . "\n";
    echo "Total de colunas na tabela: " . count($columns) . "\n";

    $missing = array_diff($transformColumns, $existingColumns);
    if (count($missing) > 0) {
        echo "\n⚠️ Faltam " . count($missing) . " colunas: " . implode(', ', $missing) . "\n";
    } else {
        echo "\n✓ Todas as colunas de transformação existem!\n";
    }

    echo "</pre>";

} catch (PDOException $e) {
    echo "<pre style='color: red;'>❌ Erro: " . $e->getMessage() . "</pre>";
}
