#!/bin/bash

set -e

echo "=========================================="
echo "Running database migrations..."
echo "=========================================="
npm run db:push
echo "Migrations complete."
echo ""

echo "=========================================="
echo "Seeding job roles..."
echo "=========================================="
npx tsx scripts/seed-roles.ts
echo ""

echo "=========================================="
echo "Starting production server..."
echo "=========================================="
npm run start
