#!/bin/bash

# Reset Users Table to Initial Seeded State
# Quick script to reset the users table for testing
# Uses safe database tools to avoid credential exposure

echo "🔄 Resetting users table to initial seeded state..."
echo ""

# Use the safe database reset tool
./db reset --confirm

echo ""
echo "✅ Reset complete! Ready for testing."
