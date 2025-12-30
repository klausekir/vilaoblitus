// Script para verificar arrowDirection no banco de dados
const mysql = require('mysql2/promise');

async function checkArrows() {
    const connection = await mysql.createConnection({
        host: 'srv1364.hstgr.io',
        user: 'u811529511_vobadmin',
        password: 'Italia2018!123',
        database: 'u811529511_voblitus'
    });

    try {
        const [locs] = await connection.execute("SELECT id, name, hotspots FROM locations ORDER BY id");

        console.log(`=== Verificando arrowDirection em ${locs.length} locations ===\n`);

        let totalHotspots = 0;
        let totalWithArrow = 0;

        locs.forEach(loc => {
            if (loc.hotspots) {
                try {
                    const hotspots = JSON.parse(loc.hotspots);

                    if (hotspots && Array.isArray(hotspots)) {
                        totalHotspots += hotspots.length;

                        const hotspotsWithArrow = hotspots.filter(h => h.arrowDirection);

                        if (hotspotsWithArrow.length > 0) {
                            console.log(`📍 ${loc.id} (${loc.name})`);
                            hotspotsWithArrow.forEach(h => {
                                const arrow = { up: '⬆️', down: '⬇️', left: '⬅️', right: '➡️' }[h.arrowDirection] || '?';
                                console.log(`  ${arrow} ${h.name} → ${h.target} (${h.arrowDirection})`);
                                totalWithArrow++;
                            });
                            console.log('');
                        }
                    }
                } catch (e) {
                    console.log(`❌ ${loc.id}: Erro ao parsear - ${e.message}`);
                }
            }
        });

        console.log(`\n📊 Estatísticas:`);
        console.log(`   Total de hotspots: ${totalHotspots}`);
        console.log(`   Com arrowDirection: ${totalWithArrow}`);
        console.log(`   Sem arrowDirection: ${totalHotspots - totalWithArrow}`);

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await connection.end();
    }
}

checkArrows();
