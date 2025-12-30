// Migration: Adicionar coluna arrow_direction na tabela hotspots
const mysql = require('mysql2/promise');

async function runMigration() {
    const connection = await mysql.createConnection({
        host: 'srv1364.hstgr.io',
        user: 'u811529511_vobadmin',
        password: 'Italia2018!123',
        database: 'u811529511_voblitus'
    });

    try {
        const sql = "ALTER TABLE hotspots ADD COLUMN arrow_direction ENUM('up', 'down', 'left', 'right') NULL DEFAULT NULL AFTER target_location";

        await connection.execute(sql);

        console.log('✅ Coluna arrow_direction adicionada com sucesso à tabela hotspots!');

    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('ℹ️ Coluna arrow_direction já existe na tabela hotspots');
        } else {
            console.error('❌ Erro:', error.message);
            process.exit(1);
        }
    } finally {
        await connection.end();
    }
}

runMigration();
