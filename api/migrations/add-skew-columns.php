<?php
/**
 * Migration: Add skew_x and skew_y columns to hotspots table
 */

require_once '../config.php';

try {
    $pdo = getDBConnection();

    echo "Checking if skew columns exist...\n";

    // Check if columns already exist
    $stmt = $pdo->query("SHOW COLUMNS FROM hotspots LIKE 'skew_%'");
    $existing = $stmt->fetchAll(PDO::FETCH_COLUMN);

    if (count($existing) >= 2) {
        echo "✓ Columns skew_x and skew_y already exist!\n";
        exit(0);
    }

    echo "Adding skew columns to hotspots table...\n";

    // Add skew_x column if it doesn't exist
    if (!in_array('skew_x', $existing)) {
        $pdo->exec("ALTER TABLE hotspots ADD COLUMN skew_x DECIMAL(10, 2) DEFAULT 0 AFTER scale_y");
        echo "✓ Added column: skew_x\n";
    }

    // Add skew_y column if it doesn't exist
    if (!in_array('skew_y', $existing)) {
        $pdo->exec("ALTER TABLE hotspots ADD COLUMN skew_y DECIMAL(10, 2) DEFAULT 0 AFTER skew_x");
        echo "✓ Added column: skew_y\n";
    }

    echo "\n✅ Migration completed successfully!\n";

} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
