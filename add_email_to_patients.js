const db = require('./config/db');

async function addEmailColumn() {
    try {
        const connection = await db.getConnection();
        console.log('Connected to database...');

        // Check if column exists
        const [columns] = await connection.execute(
            "SHOW COLUMNS FROM patients LIKE 'email'"
        );

        if (columns.length === 0) {
            console.log('Adding email column to patients table...');
            await connection.execute(
                "ALTER TABLE patients ADD COLUMN email VARCHAR(255) NULL AFTER phone"
            );
            console.log('✅ Email column added successfully');
        } else {
            console.log('ℹ️ Email column already exists');
        }

        connection.release();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error adding email column:', error);
        process.exit(1);
    }
}

addEmailColumn();
