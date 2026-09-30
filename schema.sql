CREATE TABLE IF NOT EXISTS bills (
    id TEXT PRIMARY KEY,
    diary_no TEXT,
    hospital_name TEXT,
    bill_amount REAL,
    status TEXT,
    data_json TEXT,
    updated_at TEXT
);