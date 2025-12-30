// Script para consultar banco de dados MySQL
const mysql = require('mysql2/promise');

async function queryDatabase() {
    const connection = await mysql.createConnection({
        host: 'srv1364.hstgr.io',
        user: 'u811529511_vobadmin',
        password: 'Italia2018!123',
        database: 'u811529511_voblitus'
    });

    try {
        // Buscar todas as locations que contenham triangulo no campo puzzle
        const [locs] = await connection.execute("SELECT id, name, puzzle FROM locations WHERE puzzle LIKE '%triangulo%'");

        console.log(`=== LOCATIONS COM TRIÂNGULO (${locs.length} encontradas) ===\n`);

        locs.forEach(loc => {
            console.log(`📍 ${loc.id} (${loc.name})`);

            if (loc.puzzle) {
                try {
                    const puzzleData = JSON.parse(loc.puzzle);

                    if (puzzleData.items) {
                        const triangulo = puzzleData.items.find(i => i.id === 'triangulo');
                        if (triangulo) {
                            console.log('🔺 TRIÂNGULO:');
                            console.log(JSON.stringify(triangulo, null, 2));
                            console.log('');
                        }
                    }
                } catch (e) {
                    console.log('❌ Erro ao parsear puzzle:', e.message);
                }
            }
        });

    } catch (error) {
        console.error('Erro ao consultar banco:', error.message);
    } finally {
        await connection.end();
    }
}

queryDatabase();
