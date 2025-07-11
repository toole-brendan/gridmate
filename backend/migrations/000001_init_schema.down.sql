-- Drop triggers
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
DROP TRIGGER IF EXISTS update_models_updated_at ON models;
DROP TRIGGER IF EXISTS update_workspaces_updated_at ON workspaces;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop indexes
DROP INDEX IF EXISTS idx_audit_logs_created_at;
DROP INDEX IF EXISTS idx_audit_logs_entity;
DROP INDEX IF EXISTS idx_audit_logs_user;
DROP INDEX IF EXISTS idx_messages_conversation;
DROP INDEX IF EXISTS idx_conversations_user;
DROP INDEX IF EXISTS idx_conversations_model;
DROP INDEX IF EXISTS idx_models_created_by;
DROP INDEX IF EXISTS idx_models_workspace;
DROP INDEX IF EXISTS idx_workspaces_owner;
DROP INDEX IF EXISTS idx_users_email;

-- Drop tables in reverse order of dependencies
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS conversations;
DROP TABLE IF EXISTS model_versions;
DROP TABLE IF EXISTS models;
DROP TABLE IF EXISTS workspace_members;
DROP TABLE IF EXISTS workspaces;
DROP TABLE IF EXISTS users;

-- Drop extensions
DROP EXTENSION IF EXISTS "pgcrypto";
DROP EXTENSION IF EXISTS "uuid-ossp";