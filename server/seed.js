const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const csvPath = path.join(__dirname, '..', 'Ads_accounts.csv');

// Connect to localhost:5488 because we are running this script from the host machine
const pool = new Pool({
    user: 'postgres',
    password: 'X7z9#mK2$LpQvN4r',
    host: 'localhost',
    port: 5488,
    database: 'ads_db',
});

async function seed() {
    try {
        const csvContent = fs.readFileSync(csvPath, 'utf8');
        const lines = csvContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        if (lines.length < 2) {
            console.log('CSV is empty');
            return;
        }

        // Headers: id,name,account_id,Account_status,business_name,id_dev,label_status,Balance,create_date,age,createdAt,updatedAt
        // We need to map these to our table columns:
        // account_id (PK), name, csv_id (id), account_status, business_name, id_dev, label_status, balance, create_date, age, created_at, updated_at

        console.log(`Found ${lines.length - 1} rows to insert...`);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Clear existing data? Maybe not, or yes for idempotent test.
            await client.query('TRUNCATE TABLE ads_accounts');

            for (let i = 1; i < lines.length; i++) {
                const line = lines[i];
                // quick n dirty regex split to handle simple quotes if any, or just split by comma
                const cols = line.split(',');

                // Mapping based on CSV structure seen in view_file
                // 0: id
                // 1: name
                // 2: account_id
                // 3: Account_status
                // 4: business_name
                // 5: id_dev
                // 6: label_status
                // 7: Balance
                // 8: create_date
                // 9: age
                // 10: createdAt
                // 11: updatedAt

                const query = `
          INSERT INTO ads_accounts (
            csv_id, name, account_id, account_status, business_name, 
            id_dev, label_status, balance, create_date, age, 
            created_at, updated_at, ativo_catofe
          ) VALUES (
            $1, $2, $3, $4, $5, 
            $6, $7, $8, $9, $10, 
            $11, $12, FALSE
          )
          ON CONFLICT (account_id) DO NOTHING
        `;

                const values = [
                    parseInt(cols[0]) || 0, // csv_id
                    cols[1] || '', // name
                    cols[2] || '', // account_id
                    cols[3] || '', // account_status
                    cols[4] || '', // business_name
                    cols[5] || '', // id_dev
                    cols[6] || '', // label_status
                    parseFloat(cols[7]) || 0, // balance
                    cols[8] ? new Date(cols[8]) : null, // create_date
                    parseInt(cols[9]) || 0, // age
                    cols[10] ? new Date(cols[10]) : null, // created_at
                    cols[11] ? new Date(cols[11]) : null // updated_at
                ];

                await client.query(query, values);
            }

            await client.query('COMMIT');
            console.log('Seeding completed successfully.');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }

    } catch (err) {
        console.error('Seeding failed:', err);
    } finally {
        pool.end();
    }
}

seed();
