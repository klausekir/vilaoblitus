#!/usr/bin/env node
const mysql = require('mysql2/promise');

async function addSpritesheetConfig() {
    const connection = await mysql.createConnection({
        host: 'srv1364.hstgr.io',
        user: 'u811529511_vobadmin',
        password: 'Italia2018!123',
        database: 'u811529511_voblitus'
    });

    try {
        console.log('[*] Adicionando colunas de configuração de spritesheet...\n');

        // Adicionar colunas se não existirem
        await connection.execute(`
            ALTER TABLE hotspots
            ADD COLUMN IF NOT EXISTS spritesheet_frame_width INT DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS spritesheet_frame_height INT DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS spritesheet_frames INT DEFAULT NULL
        `);

        console.log('[OK] Colunas adicionadas!\n');

        // Configurar árvore com valores default (ajustar depois conforme necessário)
        await connection.execute(`
            UPDATE hotspots
            SET spritesheet_frame_width = 249,
                spritesheet_frame_height = 341,
                spritesheet_frames = 12
            WHERE item_id = 'arvore'
        `);

        console.log('[OK] Árvore configurada com:');
        console.log('  Frame Width: 249px');
        console.log('  Frame Height: 341px');
        console.log('  Total Frames: 12\n');

        console.log('[SUCCESS] Configuração concluída!');

    } catch (error) {
        console.error('[ERROR]', error.message);
    } finally {
        await connection.end();
    }
}

addSpritesheetConfig().catch(console.error);
