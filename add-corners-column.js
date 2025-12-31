// Migration: Adicionar coluna corners na tabela hotspots para quadriláteros irregulares
const mysql = require('mysql2/promise');

async function runMigration() {
    const connection = await mysql.createConnection({
        host: 'srv1364.hstgr.io',
        user: 'u811529511_vobadmin',
        password: 'Italia2018!123',
        database: 'u811529511_voblitus'
    });

    try {
        const sql = "ALTER TABLE hotspots ADD COLUMN corners TEXT NULL DEFAULT NULL AFTER height";

        await connection.execute(sql);

        console.log('✅ Coluna corners adicionada com sucesso à tabela hotspots!');

    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('ℹ️ Coluna corners já existe na tabela hotspots');
        } else {
            console.error('❌ Erro:', error.message);
            process.exit(1);
        }
    } finally {
        await connection.end();
    }
}

runMigration();
