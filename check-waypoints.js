// Script para verificar waypoints no banco
const mysql = require('mysql2/promise');

async function checkWaypoints() {
    const connection = await mysql.createConnection({
        host: 'srv1364.hstgr.io',
        user: 'u811529511_vobadmin',
        password: 'Italia2018!123',
        database: 'u811529511_voblitus'
    });

    try {
        console.log('Verificando hotspots com waypoints...\n');

        const [rows] = await connection.execute(`
            SELECT id, location_id, item_id, is_decorative, waypoints 
            FROM hotspots 
            WHERE waypoints IS NOT NULL AND waypoints != ''
            LIMIT 10
        `);

        if (rows.length === 0) {
            console.log('❌ Nenhum hotspot com waypoints encontrado no banco!');
            console.log('\nVerificando se existem itens decorativos:');

            const [items] = await connection.execute(`
                SELECT id, location_id, item_id, is_decorative 
                FROM hotspots 
                WHERE type = 'item' AND is_decorative = 1
                LIMIT 5
            `);

            items.forEach(item => {
                console.log(`  - ID: ${item.id}, Location: ${item.location_id}, Item: ${item.item_id}`);
            });
        } else {
            console.log(`✅ Encontrados ${rows.length} hotspots com waypoints:\n`);
            rows.forEach(row => {
                console.log(`ID: ${row.id}`);
                console.log(`  Location: ${row.location_id}`);
                console.log(`  Item: ${row.item_id}`);
                console.log(`  Waypoints: ${row.waypoints}`);
                console.log('');
            });
        }

    } catch (error) {
        console.error('Erro:', error.message);
    } finally {
        await connection.end();
    }
}

checkWaypoints();
