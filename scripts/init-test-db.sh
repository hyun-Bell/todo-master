#!/bin/bash
set -e

echo "Initializing test database..."

# Wait for PostgreSQL to be ready
until pg_isready -U $POSTGRES_USER -d $POSTGRES_DB; do
  echo "Waiting for PostgreSQL to be ready..."
  sleep 2
done

# Create test database if it doesn't exist
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create test user if not exists
    DO
    \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'testuser') THEN
            CREATE USER testuser WITH PASSWORD 'testpassword';
        END IF;
    END
    \$\$;

    -- Grant privileges
    GRANT ALL PRIVILEGES ON DATABASE $POSTGRES_DB TO testuser;
    GRANT CREATE ON SCHEMA public TO testuser;

    -- Create extensions needed by Prisma and Supabase
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    
    -- Create test data schemas
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE SCHEMA IF NOT EXISTS storage;
    CREATE SCHEMA IF NOT EXISTS realtime;
    
    -- Grant permissions
    GRANT ALL ON SCHEMA auth TO testuser;
    GRANT ALL ON SCHEMA storage TO testuser;
    GRANT ALL ON SCHEMA realtime TO testuser;
EOSQL

echo "Test database initialized successfully!"