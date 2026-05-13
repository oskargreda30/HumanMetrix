#!/bin/bash

set -e

echo "=========================================="
echo "Running database migrations..."
echo "=========================================="
npm run db:push
echo "Migrations complete."
echo ""

echo "=========================================="
echo "Starting production server..."
echo "=========================================="
npm run start
