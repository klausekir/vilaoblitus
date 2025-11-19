-- Tabela para Paredes Destrutíveis
-- Execute este script no seu banco de dados MySQL

CREATE TABLE IF NOT EXISTS destructible_walls (
    id INT AUTO_INCREMENT PRIMARY KEY,
    location_id VARCHAR(50) NOT NULL,
    wall_id VARCHAR(50) NOT NULL, -- ID interno usado no JSON/Game (ex: wall_secret_01)
    x DECIMAL(5,2) NOT NULL DEFAULT 0, -- Posição X em %
    y DECIMAL(5,2) NOT NULL DEFAULT 0, -- Posição Y em %
    width DECIMAL(5,2) NOT NULL DEFAULT 10, -- Largura em %
    height DECIMAL(5,2) NOT NULL DEFAULT 20, -- Altura em %
    image VARCHAR(255), -- Caminho da imagem (opcional)
    required_item VARCHAR(50) DEFAULT 'gun', -- Item necessário para destruir
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
    INDEX idx_location (location_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
