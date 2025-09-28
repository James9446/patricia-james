#!/bin/bash

# Wedding App System Check Script
# Quick startup verification for development sessions

echo "🚀 Wedding App System Check"
echo "=========================="
echo ""

# Check if we're in the right directory
if [ ! -f "server/package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected: patricia-james-app/"
    exit 1
fi

echo "✅ Found project structure"
echo ""

# Run the comprehensive startup check
echo "Running comprehensive system check..."
echo ""

cd server
node scripts/startup-check.js

# Capture exit code
EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo "🎉 System check completed successfully!"
    echo "✅ Ready for development"
else
    echo "❌ System check failed"
    echo "⚠️  Please fix the issues above before continuing"
fi

exit $EXIT_CODE
