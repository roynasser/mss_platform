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

echo "🔄 Rebuilding MSS Platform development environment..."
echo "This will stop containers, rebuild images, and restart"

$COMPOSE_CMD down
echo "📦 Building images from scratch..."
$COMPOSE_CMD build --no-cache
echo "🚀 Starting environment..."
$COMPOSE_CMD up -d

echo "✅ Environment rebuilt and started successfully"
echo "📊 Container status:"
$COMPOSE_CMD ps