-- This script runs when the PostgreSQL container is first created
-- It sets up the initial database and user if needed

-- Create database if it doesn't exist (usually handled by docker-compose environment variables)
-- CREATE DATABASE gridmate_db;

-- Grant all privileges to the gridmate user
GRANT ALL PRIVILEGES ON DATABASE gridmate_db TO gridmate;

-- Create extensions that require superuser privileges
\c gridmate_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";