#!/bin/bash

# Detect Docker Compose command
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    echo "Error: Docker Compose not found"
    exit 1
fi

echo "🧹 Cleaning MSS Platform development environment..."
echo "⚠️  This will remove all data (database, redis, etc.)"
read -p "Are you sure? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    $COMPOSE_CMD down -v --remove-orphans
    echo "✅ Environment cleaned successfully"
else
    echo "❌ Cleanup cancelled"
fi