#!/bin/bash

# Reset to Seeded State Script
# Complete reset to initial seeded state

echo "🔄 Resetting database to initial seeded state..."
echo ""

# Use the database manager to reset
cd "$(dirname "$0")/../server"
echo "yes" | node scripts/db-manager.js reset

echo ""
echo "✅ Database reset to seeded state! Ready for testing."
