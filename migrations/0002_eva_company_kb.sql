-- Apply ONLY to a dedicated EVA_DB database (not the TCS INSTAL demo DB).
CREATE TABLE IF NOT EXISTS eva_company_kb (
 tenant_id TEXT NOT NULL,
 qa_id TEXT NOT NULL,
 question TEXT NOT NULL,
 answer TEXT NOT NULL,
 followup TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY (tenant_id, qa_id)
);
CREATE INDEX IF NOT EXISTS eva_company_kb_status ON eva_company_kb(tenant_id,status);
