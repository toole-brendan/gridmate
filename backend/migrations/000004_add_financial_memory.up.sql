-- Add financial modeling preferences table for AI memory system
CREATE TABLE IF NOT EXISTS financial_modeling_preferences (
    user_id UUID PRIMARY KEY,
    preferred_layouts JSONB NOT NULL DEFAULT '{}',
    formatting_prefs JSONB NOT NULL DEFAULT '{}',
    calculation_prefs JSONB NOT NULL DEFAULT '{}',
    professional_standards VARCHAR(10) NOT NULL DEFAULT 'universal',
    default_assumptions JSONB NOT NULL DEFAULT '{}',
    section_ordering JSONB NOT NULL DEFAULT '["assumptions", "calculations", "outputs", "summary"]',
    style_preferences JSONB NOT NULL DEFAULT '{}',
    validation_prefs JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_user_preferences 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_financial_preferences_user_id ON financial_modeling_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_preferences_standards ON financial_modeling_preferences(professional_standards);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_financial_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_financial_preferences_updated_at_trigger
    BEFORE UPDATE ON financial_modeling_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_financial_preferences_updated_at();