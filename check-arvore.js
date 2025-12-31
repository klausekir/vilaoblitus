const mysql = require('mysql2/promise');

async function checkArvore() {
    const connection = await mysql.createConnection({
        host: 'srv1364.hstgr.io',
        user: 'u811529511_vobadmin',
        password: 'Italia2018!123',
        database: 'u811529511_voblitus'
    });

    console.log('[*] Verificando item arvore...\n');

    try {
        const [rows] = await connection.execute(`
            SELECT h.id, h.location_id, h.item_id, h.display_image, h.is_decorative
            FROM hotspots h
            WHERE h.item_id = 'arvore'
        `);

        if (rows.length === 0) {
            console.log('[!] Nenhum item arvore encontrado!\n');
        } else {
            rows.forEach(row => {
                console.log(`Location: ${row.location_id}`);
                console.log(`Item ID: ${row.item_id}`);
                console.log(`Image Path: ${row.display_image}`);
                console.log(`Is Decorative: ${row.is_decorative}`);
                console.log('');
            });
        }
    } catch (error) {
        console.error('[ERROR]', error.message);
    } finally {
        await connection.end();
    }
}

checkArvore().catch(console.error);
