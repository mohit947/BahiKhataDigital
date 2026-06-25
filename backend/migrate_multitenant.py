"""
Run once: adds organization multi-tenancy to existing database.
Usage: cd backend && python migrate_multitenant.py
"""
import os
from dotenv import load_dotenv
import psycopg2

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
conn = psycopg2.connect(DATABASE_URL)
conn.autocommit = False
cur = conn.cursor()

SQL = """
-- 1. Organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    gstin VARCHAR(20),
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. Default org for existing data
INSERT INTO organizations (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Organization')
ON CONFLICT DO NOTHING;

-- 3. Users: add org_id
ALTER TABLE users ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
UPDATE users SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
ALTER TABLE users ALTER COLUMN org_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_org_id ON users(org_id);

-- 4. Bills: add org_id, remove global unique on bill_number
ALTER TABLE bills ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
UPDATE bills SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
ALTER TABLE bills ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE bills DROP CONSTRAINT IF EXISTS bills_bill_number_key;
CREATE UNIQUE INDEX IF NOT EXISTS bills_bill_number_org_unique ON bills(bill_number, org_id);
CREATE INDEX IF NOT EXISTS idx_bills_org_id ON bills(org_id);

-- 5. Customers: add org_id
ALTER TABLE customers ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
UPDATE customers SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
ALTER TABLE customers ALTER COLUMN org_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_org_id ON customers(org_id);

-- 6. Products: add org_id, fix SKU uniqueness per-org
ALTER TABLE products ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
UPDATE products SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
ALTER TABLE products ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_sku_key;
CREATE UNIQUE INDEX IF NOT EXISTS products_sku_org_unique ON products(sku, org_id) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_org_id ON products(org_id);

-- 7. BillSequence: per-org sequences
ALTER TABLE bill_sequences ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
UPDATE bill_sequences SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
ALTER TABLE bill_sequences DROP CONSTRAINT IF EXISTS bill_sequences_financial_year_key;
CREATE UNIQUE INDEX IF NOT EXISTS bill_sequences_org_year_unique ON bill_sequences(org_id, financial_year) WHERE org_id IS NOT NULL;
"""

try:
    cur.execute(SQL)
    conn.commit()
    print("Migration complete.")
except Exception as e:
    conn.rollback()
    print(f"Migration failed: {e}")
    raise
finally:
    cur.close()
    conn.close()
