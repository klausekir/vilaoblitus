// Script para configurar arrow_direction nos hotspots
const mysql = require('mysql2/promise');

async function setArrows() {
    const connection = await mysql.createConnection({
        host: 'srv1364.hstgr.io',
        user: 'u811529511_vobadmin',
        password: 'Italia2018!123',
        database: 'u811529511_voblitus'
    });

    try {
        // Buscar hotspots da cena casa_abandonada_02_sala
        const [hotspots] = await connection.execute(
            "SELECT id, location_id, label, target_location FROM hotspots WHERE location_id = 'casa_abandonada_02_sala'"
        );

        console.log(`\n📍 Hotspots encontrados em casa_abandonada_02_sala: ${hotspots.length}\n`);

        hotspots.forEach(h => {
            console.log(`   ID: ${h.id}`);
            console.log(`   Label: ${h.label}`);
            console.log(`   Target: ${h.target_location}`);
            console.log('');
        });

        // Atualizar os hotspots com as direções corretas
        console.log('🔄 Configurando arrow_direction...\n');

        // hotspot_17671203611760.581184412082732 = down (baixo/voltar)
        await connection.execute(
            "UPDATE hotspots SET arrow_direction = 'down' WHERE id = 'hotspot_17671203611760.581184412082732'"
        );
        console.log('✅ hotspot_17671203611760.581184412082732 → down ⬇️');

        // hotspot_17671203611760.42439739603987836 = right (direita)
        await connection.execute(
            "UPDATE hotspots SET arrow_direction = 'right' WHERE id = 'hotspot_17671203611760.42439739603987836'"
        );
        console.log('✅ hotspot_17671203611760.42439739603987836 → right ➡️');

        console.log('\n✅ Hotspots configurados com sucesso!');
        console.log('\n💡 Agora dê F5 no jogo e teste as setas do teclado.');

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await connection.end();
    }
}

setArrows();
