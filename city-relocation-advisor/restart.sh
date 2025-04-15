#!/bin/bash

# Display header
echo "==============================================="
echo "    City Relocation Advisor Restart Script"
echo "==============================================="
echo ""

# Stop any running Next.js processes
echo "🛑 Stopping any running Next.js processes..."
pkill -f "node.*next"
sleep 2

# Clear Next.js cache
echo "🧹 Clearing Next.js cache..."
rm -rf city-relocation-advisor/.next/cache
echo "✅ Cache cleared"

# Check for .env.local file
if [ -f "city-relocation-advisor/.env.local" ]; then
  echo "✅ Found .env.local file"
else
  echo "⚠️ No .env.local file found! The application may not work correctly."
  echo "Please create one with the required API keys."
fi

# Display environment variables without revealing the actual values
echo ""
echo "🔑 Checking environment variables..."
grep -v "^#" city-relocation-advisor/.env.local | sed 's/=.*/=******/' || echo "No environment variables found"

# Restart the application
echo ""
echo "🚀 Restarting the application..."
cd city-relocation-advisor && npm run dev 