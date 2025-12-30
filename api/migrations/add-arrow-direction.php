<?php
// Migration: Adicionar coluna arrowDirection na tabela hotspots

require_once '../config.php';

try {
    $sql = "ALTER TABLE hotspots ADD COLUMN arrow_direction ENUM('up', 'down', 'left', 'right') NULL DEFAULT NULL AFTER target_location";

    $pdo->exec($sql);

    echo "✅ Coluna arrow_direction adicionada com sucesso à tabela hotspots!\n";

} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo "ℹ️ Coluna arrow_direction já existe na tabela hotspots\n";
    } else {
        echo "❌ Erro: " . $e->getMessage() . "\n";
        exit(1);
    }
}
