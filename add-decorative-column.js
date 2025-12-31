const mysql = require('mysql2/promise');

async function addDecorativeColumn() {
    const connection = await mysql.createConnection({
        host: 'srv1364.hstgr.io',
        user: 'u811529511_vobadmin',
        password: 'Italia2018!123',
        database: 'u811529511_voblitus'
    });

    console.log('🔧 Adicionando coluna is_decorative à tabela hotspots...\n');

    try {
        // Verificar se a coluna já existe
        const [columns] = await connection.execute(
            `SHOW COLUMNS FROM hotspots LIKE 'is_decorative'`
        );

        if (columns.length > 0) {
            console.log('⚠️  Coluna is_decorative já existe!');
            console.log('   Nenhuma alteração necessária.\n');
        } else {
            // Adicionar a coluna
            await connection.execute(
                `ALTER TABLE hotspots ADD COLUMN is_decorative TINYINT(1) DEFAULT 0
                 COMMENT 'Flag para itens decorativos (não coletáveis, sem interação)'`
            );

            console.log('✅ Coluna is_decorative adicionada com sucesso!');
            console.log('   Tipo: TINYINT(1)');
            console.log('   Default: 0');
            console.log('   Descrição: Flag para itens decorativos\n');
        }

        // Verificar resultado
        const [result] = await connection.execute(
            `SHOW COLUMNS FROM hotspots LIKE 'is_decorative'`
        );

        if (result.length > 0) {
            console.log('📋 Informações da coluna:');
            console.log('   Field:', result[0].Field);
            console.log('   Type:', result[0].Type);
            console.log('   Null:', result[0].Null);
            console.log('   Default:', result[0].Default);
            console.log('   Extra:', result[0].Extra || 'N/A');
        }

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await connection.end();
    }
}

addDecorativeColumn().catch(console.error);
