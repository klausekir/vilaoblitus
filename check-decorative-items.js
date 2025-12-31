const mysql = require('mysql2/promise');

async function checkDecorativeItems() {
    const connection = await mysql.createConnection({
        host: 'srv1364.hstgr.io',
        user: 'u811529511_vobadmin',
        password: 'Italia2018!123',
        database: 'u811529511_voblitus'
    });

    console.log('🔍 Verificando itens decorativos no banco...\n');

    try {
        // Buscar todos os itens (type='item')
        const [items] = await connection.execute(
            `SELECT *
             FROM hotspots
             WHERE type = 'item'
             ORDER BY location_id`
        );

        if (items.length === 0) {
            console.log('❌ Nenhum item encontrado!\n');
        } else {
            console.log(`📋 Total de ${items.length} itens encontrados:\n`);

            const decorativeItems = items.filter(i => i.is_decorative === 1);
            const regularItems = items.filter(i => i.is_decorative !== 1);

            console.log(`🎨 ITENS DECORATIVOS: ${decorativeItems.length}`);
            decorativeItems.forEach(item => {
                console.log(`   ✓ ${item.location_id} - ${item.item_id}`);
                console.log(`     is_decorative: ${item.is_decorative}`);
                console.log('');
            });

            console.log(`📦 ITENS NORMAIS: ${regularItems.length}`);
            regularItems.forEach(item => {
                console.log(`   • ${item.location_id} - ${item.item_id}`);
                console.log(`     is_decorative: ${item.is_decorative || 0}`);
            });
        }

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await connection.end();
    }
}

checkDecorativeItems().catch(console.error);
