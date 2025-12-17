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
app.get('/api/accounts', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM ads_accounts ORDER BY name ASC');
        // Map database columns to frontend expected format if needed, but we used same names mostly.
        // Frontend expects: { id, name, accountId, status } + loaded from DB we have snake_case
        // Let's return raw and adjust frontend or map here.
        // Mapping for consistency with previous frontend code:
        const mapped = result.rows.map(row => ({
            id: row.csv_id,
            name: row.name,
            accountId: row.account_id,
            status: row.account_status,
            ativo_catofe: row.ativo_catofe
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

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
