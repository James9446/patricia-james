#!/bin/bash

# Clear Test Users Script
# Simple script to remove test users (those with test emails or created during testing)

echo "🧹 Clearing test users..."
echo ""

# Use the database helper to clear test users
cd "$(dirname "$0")/server"
node db-helper.js "DELETE FROM users WHERE email LIKE '%test%' OR email LIKE '%example.com%' OR account_status = 'guest';"

echo ""
echo "✅ Test users cleared! Ready for testing."
