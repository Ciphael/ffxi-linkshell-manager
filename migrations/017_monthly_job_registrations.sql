-- Migration 017: Monthly Job Registration System
-- Tracks user's main job selection per month with point multipliers

-- Create monthly_job_registrations table
CREATE TABLE IF NOT EXISTS monthly_job_registrations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month_year INTEGER NOT NULL, -- Format: YYYYMM (e.g., 202501, 202512)
    job VARCHAR(3) NOT NULL CHECK (job IN (
        'WAR', 'MNK', 'WHM', 'BLM', 'RDM', 'THF',
        'PLD', 'DRK', 'BST', 'BRD', 'RNG', 'SAM',
        'NIN', 'DRG', 'SMN', 'BLU', 'COR', 'PUP',
        'DNC', 'SCH', 'GEO', 'RUN'
    )),
    consecutive_months INTEGER DEFAULT 1, -- How many consecutive months with same job
    multiplier DECIMAL(3,2) DEFAULT 1.00, -- Point multiplier (1.00, 1.25, 1.50, 1.75)
    locked BOOLEAN DEFAULT FALSE, -- If true, only admins can change
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id), -- Track who made the change

    -- Ensure one job per user per month
    CONSTRAINT unique_user_month UNIQUE (user_id, month_year)
);

-- Indexes for performance
CREATE INDEX idx_monthly_job_user ON monthly_job_registrations(user_id);
CREATE INDEX idx_monthly_job_month ON monthly_job_registrations(month_year);
CREATE INDEX idx_monthly_job_user_month ON monthly_job_registrations(user_id, month_year DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_monthly_job_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER monthly_job_update_timestamp
    BEFORE UPDATE ON monthly_job_registrations
    FOR EACH ROW
    EXECUTE FUNCTION update_monthly_job_timestamp();
