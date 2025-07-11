-- Drop triggers first
DROP TRIGGER IF EXISTS update_api_keys_updated_at ON api_keys;
DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
DROP TRIGGER IF EXISTS update_oauth_providers_updated_at ON oauth_providers;

-- Drop indexes
DROP INDEX IF EXISTS idx_api_keys_user;
DROP INDEX IF EXISTS idx_api_keys_prefix;
DROP INDEX IF EXISTS idx_api_keys_active;
DROP INDEX IF EXISTS idx_sessions_user;
DROP INDEX IF EXISTS idx_sessions_token;
DROP INDEX IF EXISTS idx_oauth_providers_user;
DROP INDEX IF EXISTS idx_rate_limits_identifier;

-- Remove columns from users table
ALTER TABLE users DROP COLUMN IF EXISTS azure_ad_id;
ALTER TABLE users DROP COLUMN IF EXISTS azure_tenant_id;
ALTER TABLE users DROP COLUMN IF EXISTS external_id;

-- Drop tables
DROP TABLE IF EXISTS rate_limits;
DROP TABLE IF EXISTS oauth_providers;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS api_keys;