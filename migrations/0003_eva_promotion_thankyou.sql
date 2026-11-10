-- Dedicated EVA_DB only. Do not apply to TCS demo database.
CREATE TABLE IF NOT EXISTS eva_promotions (
 tenant_id TEXT NOT NULL PRIMARY KEY,
 code TEXT NOT NULL,
 title TEXT NOT NULL,
 discount_kind TEXT NOT NULL CHECK(discount_kind IN ('percent','fixed')),
 discount_value INTEGER NOT NULL CHECK(discount_value>0),
 currency TEXT NOT NULL DEFAULT 'RON',
 eligible_service TEXT NOT NULL DEFAULT '',
 terms TEXT NOT NULL DEFAULT '',
 valid_from TEXT NOT NULL,
 valid_until TEXT NOT NULL,
 enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS eva_leads (
 tenant_id TEXT NOT NULL,
 lead_id TEXT NOT NULL,
 service TEXT NOT NULL,
 locality TEXT NOT NULL,
 contact TEXT NOT NULL,
 note TEXT NOT NULL DEFAULT '',
 consent INTEGER NOT NULL CHECK(consent=1),
 promotion_code TEXT,
 promo_snapshot TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(tenant_id,lead_id)
);
CREATE INDEX IF NOT EXISTS eva_leads_tenant_time ON eva_leads(tenant_id,created_at);
