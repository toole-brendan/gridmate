-- Drop financial modeling preferences table
DROP TRIGGER IF EXISTS update_financial_preferences_updated_at_trigger ON financial_modeling_preferences;
DROP FUNCTION IF EXISTS update_financial_preferences_updated_at();
DROP INDEX IF EXISTS idx_financial_preferences_standards;
DROP INDEX IF EXISTS idx_financial_preferences_user_id;
DROP TABLE IF EXISTS financial_modeling_preferences;