#!/bin/bash


# Save current directory
CWD=$(pwd)

# Create test directory if not exists
TEST_DIR="$CWD/backend/__tests__"
mkdir -p "$TEST_DIR"

# Copy test script to test directory
cp "$CWD/TestSuite.js" "$TEST_DIR/api.test.js"

# Set environment variables for test
export NODE_ENV=test
export JWT_SECRET=a513e6cJKJyohgic408jYWkPmhg/7s8UkOWas9+fblu7w42vmjLowzLin5lzZ4l6DKDmHA8b6ypkmVIfew7Mug==
export TEST_MONGO_URI=mongodb+srv://recipeuser:YRMRC8izprYX9yJB@cluster0.nkvbf4y.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0

# Run tests
cd "$CWD/backend"
npm test

# Output test results summary
echo ""
echo "========================================="
echo "🚀 API Testing Complete!"
echo "========================================="