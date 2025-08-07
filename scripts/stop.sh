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

echo "🛑 Stopping MSS Platform development environment..."
$COMPOSE_CMD down
echo "✅ Environment stopped successfully"