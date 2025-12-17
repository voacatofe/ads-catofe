CREATE TABLE IF NOT EXISTS ads_accounts (
    account_id TEXT PRIMARY KEY,
    name TEXT,
    csv_id INTEGER,
    account_status TEXT,
    business_name TEXT,
    id_dev TEXT,
    label_status TEXT,
    balance NUMERIC,
    create_date TIMESTAMP,
    age INTEGER,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    ativo_catofe BOOLEAN DEFAULT FALSE
);

-- Index for faster searching by name
CREATE INDEX IF NOT EXISTS idx_ads_accounts_name ON ads_accounts(name);
