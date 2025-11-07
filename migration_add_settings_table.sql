-- Migration: Add Game Settings Table
-- Execute this in your MySQL database to add the settings feature

USE vila_abandonada;

-- Game Settings Table (Admin configurations)
CREATE TABLE IF NOT EXISTS game_settings (
    setting_key VARCHAR(50) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    description VARCHAR(255) NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT NULL,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default settings
INSERT INTO game_settings (setting_key, setting_value, description)
VALUES ('registration_enabled', 'true', 'Controls whether new user registration is allowed')
ON DUPLICATE KEY UPDATE setting_key = setting_key;

-- Verify the table was created
SELECT * FROM game_settings;
