const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database Connection
const pool = new Pool({
    connectionString: process.env.DB_CONNECTION_STRING,
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// Routes

// GET /api/accounts - Fetch all accounts
// GET /api/accounts - Fetch all accounts (optional filter ?active=true)
app.get('/api/accounts', async (req, res) => {
    try {
        const { active } = req.query;
        let query = 'SELECT * FROM ads_accounts';
        const params = [];

        if (active === 'true') {
            query += ' WHERE ativo_catofe = TRUE';
        }

        query += ' ORDER BY name ASC';

        const result = await pool.query(query, params);

        const mapped = result.rows.map(row => ({
            id: row.csv_id,
            name: row.name,
            accountId: row.account_id,
            status: row.account_status,
            ativo_catofe: row.ativo_catofe,
            // Include other useful fields for N8N
            business_name: row.business_name,
            balance: row.balance
        }));
        res.json(mapped);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /api/save - Update ativo_catofe status
app.post('/api/save', async (req, res) => {
    const { accountIds } = req.body; // Array of account_ids that should be TRUE

    if (!Array.isArray(accountIds)) {
        return res.status(400).json({ error: 'Invalid input: accountIds must be an array' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Set all to FALSE
        await client.query('UPDATE ads_accounts SET ativo_catofe = FALSE');

        // 2. Set selected to TRUE
        if (accountIds.length > 0) {
            // Create placeholders $1, $2, ...
            const placeholders = accountIds.map((_, i) => `$${i + 1}`).join(',');
            const query = `UPDATE ads_accounts SET ativo_catofe = TRUE WHERE account_id IN (${placeholders})`;
            await client.query(query, accountIds);
        }

        await client.query('COMMIT');
        res.json({ success: true, count: accountIds.length });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Failed to update status' });
    } finally {
        client.release();
    }
});

// POST /api/accounts/sync - Sync data from N8N (Upsert)
app.post('/api/accounts/sync', async (req, res) => {
    let accountsToProcess = [];

    // 1. Check if body is directly an array
    if (Array.isArray(req.body)) {
        accountsToProcess = req.body;
    }
    // 2. Check if body has 'accounts' key which is an array
    else if (req.body.accounts && Array.isArray(req.body.accounts)) {
        accountsToProcess = req.body.accounts;
    }
    // 3. Fallback: Assume the body is a single account object
    else if (req.body && typeof req.body === 'object') {
        accountsToProcess = [req.body];
    }

    if (accountsToProcess.length === 0) {
        return res.status(400).json({ error: 'Invalid input: No account data found' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Upsert query
        const query = `
            INSERT INTO ads_accounts (
                account_id, name, account_status, business_name, 
                balance, created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, 
                $5, $6, $7
            )
            ON CONFLICT (account_id) DO UPDATE SET
                name = EXCLUDED.name,
                account_status = EXCLUDED.account_status,
                business_name = EXCLUDED.business_name,
                balance = EXCLUDED.balance,
                updated_at = EXCLUDED.updated_at
        `;

        for (const acc of accountsToProcess) {
            // Validate minimal required fields
            if (!acc.account_id) continue;

            await client.query(query, [
                acc.account_id,
                acc.name,
                acc.account_status || 'UNKNOWN',
                acc.business_name || '',
                acc.balance || 0,
                acc.created_at || new Date(),
                new Date() // updated_at is now
            ]);
        }

        await client.query('COMMIT');
        res.json({ success: true, count: accountsToProcess.length });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Failed to sync data', details: err.message });
    } finally {
        client.release();
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
