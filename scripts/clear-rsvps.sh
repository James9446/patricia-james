#!/bin/bash

# Clear RSVPs Script
# Simple script to clear all RSVPs for testing

echo "🧹 Clearing all RSVPs..."
echo ""

# Use the database helper to clear RSVPs
cd "$(dirname "$0")/../server"
node db-helper.js "DELETE FROM rsvps;"

echo ""
echo "✅ RSVPs cleared! Ready for testing."
