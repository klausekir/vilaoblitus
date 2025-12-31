const mysql = require('mysql2/promise');

async function checkCorners() {
    const connection = await mysql.createConnection({
        host: 'srv1364.hstgr.io',
        user: 'u811529511_vobadmin',
        password: 'Italia2018!123',
        database: 'u811529511_voblitus'
    });

    console.log('🔍 Verificando corners nos hotspots...\n');

    try {
        // Buscar hotspots com corners
        const [hotspots] = await connection.execute(
            'SELECT location_id, label, corners FROM hotspots WHERE corners IS NOT NULL LIMIT 10'
        );

        if (hotspots.length === 0) {
            console.log('❌ NENHUM hotspot com corners encontrado!\n');
        } else {
            console.log(`✅ ${hotspots.length} hotspots com corners encontrados:\n`);
            hotspots.forEach((h, i) => {
                console.log(`${i + 1}. Location: ${h.location_id}`);
                console.log(`   Label: ${h.label}`);
                console.log(`   Corners: ${h.corners}\n`);
            });
        }

        // Contar total de hotspots com e sem corners
        const [counts] = await connection.execute(
            'SELECT COUNT(*) as total, SUM(corners IS NOT NULL) as with_corners, SUM(corners IS NULL) as without_corners FROM hotspots'
        );

        console.log('📊 Estatísticas:');
        console.log(`   Total de hotspots: ${counts[0].total}`);
        console.log(`   Com corners: ${counts[0].with_corners}`);
        console.log(`   Sem corners: ${counts[0].without_corners}`);

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await connection.end();
    }
}

checkCorners().catch(console.error);
