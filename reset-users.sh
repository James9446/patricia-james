#!/bin/bash

# Reset Users Table to Initial Seeded State
# Quick script to reset the users table for testing

echo "🔄 Resetting users table to initial seeded state..."
echo ""

cd server && node src/admin/reset-users.js

echo ""
echo "✅ Reset complete! Ready for testing."
