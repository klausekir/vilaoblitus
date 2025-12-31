#!/usr/bin/env node
/**
 * Update arvore item to use spritesheet instead of GIF
 */

const mysql = require('mysql2/promise');

async function updateArvoreToSpritesheet() {
    const connection = await mysql.createConnection({
        host: 'srv1364.hstgr.io',
        user: 'u811529511_vobadmin',
        password: 'Italia2018!123',
        database: 'u811529511_voblitus'
    });

    try {
        console.log('[*] Updating arvore item to use spritesheet...');

        // Update the display_image for the arvore hotspot
        const [result] = await connection.execute(`
            UPDATE hotspots
            SET display_image = 'images/objects/arvore01_spritesheet.png'
            WHERE item_id = 'arvore'
        `);

        console.log(`[OK] Updated ${result.affectedRows} hotspot(s)`);

        // Verify the update
        const [rows] = await connection.execute(`
            SELECT h.id, h.location_id, h.item_id, h.display_image, h.is_decorative
            FROM hotspots h
            WHERE h.item_id = 'arvore'
        `);

        console.log('\n[*] Current arvore hotspot(s):');
        rows.forEach(row => {
            console.log(`  Location: ${row.location_id}`);
            console.log(`  Image: ${row.display_image}`);
            console.log(`  Decorative: ${row.is_decorative ? 'YES' : 'NO'}`);
            console.log('');
        });

        console.log('[SUCCESS] Arvore updated to use spritesheet!');
        console.log('[INFO] Refresh the game with Ctrl+Shift+R to see the animation');

    } catch (error) {
        console.error('[ERROR]', error.message);
        throw error;
    } finally {
        await connection.end();
    }
}

updateArvoreToSpritesheet().catch(err => {
    console.error('[FATAL]', err);
    process.exit(1);
});
