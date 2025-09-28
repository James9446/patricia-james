#!/bin/bash

# Quick Clean Script
# Remove test data but keep seeded users

echo "🧹 Quick clean - removing test data..."
echo ""

cd "$(dirname "$0")/../server"

# Clear RSVPs
echo "Clearing RSVPs..."
node scripts/db-helper.js "DELETE FROM rsvps;"

# Clear test users (those with test emails)
echo "Clearing test users..."
node scripts/db-helper.js "DELETE FROM users WHERE email LIKE '%test%' OR email LIKE '%example.com%';"

# Reset partner relationships for seeded users
echo "Resetting partner relationships..."
node scripts/db-helper.js "UPDATE users SET partner_id = NULL WHERE email IS NULL;"

echo ""
echo "✅ Quick clean complete! Seeded users remain, test data removed."
