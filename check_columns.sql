-- Verificar se as colunas existem na tabela hotspots
SHOW COLUMNS FROM hotspots LIKE '%display%';

-- Se não existirem, criar:
ALTER TABLE hotspots 
ADD COLUMN is_display_item TINYINT(1) DEFAULT 0 AFTER item_image,
ADD COLUMN display_image VARCHAR(500) DEFAULT NULL AFTER is_display_item;
