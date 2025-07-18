#!/bin/bash

echo "Cleaning up test environment..."

# Stop all containers
docker-compose -f docker-compose.test.yml down -v

# Remove test volumes
docker volume rm todomaster_supabase-db-data 2>/dev/null || true
docker volume rm todomaster_supabase-storage-data 2>/dev/null || true
docker volume rm todomaster_localstack-data 2>/dev/null || true

# Clean up any orphaned containers
docker container prune -f

# Clean up any orphaned volumes
docker volume prune -f

# Clean up any orphaned networks
docker network prune -f

echo "Test environment cleanup completed!"