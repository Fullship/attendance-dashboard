#!/bin/bash

echo "🐳 Testing Docker build with proper environment variables..."
echo ""

# Build the Docker image with the correct environment variable
echo "Building Docker image with REACT_APP_API_URL..."
docker build --build-arg REACT_APP_API_URL=https://my.fullship.net/api -t attendance-test .

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Docker build completed successfully!"
    echo ""
    echo "🔍 Testing the built image..."
    
    # Run the container briefly to test
    docker run -d --name attendance-test-container -p 3003:3002 attendance-test
    
    echo "Waiting for container to start..."
    sleep 5
    
    # Check if the frontend serves correctly
    echo "Testing frontend availability:"
    curl -s -o /dev/null -w "HTTP Status: %{http_code}" http://localhost:3003
    echo ""
    
    # Check for the API URL in the built JS
    echo ""
    echo "Checking built JS files in container:"
    docker exec attendance-test-container find /app/frontend/build/static/js -name "main.*.js" -exec grep -l "my.fullship.net/api" {} \;
    
    echo ""
    echo "Checking for localhost references:"
    docker exec attendance-test-container find /app/frontend/build/static/js -name "main.*.js" -exec grep -c "localhost:3002" {} \;
    
    # Cleanup
    echo ""
    echo "Cleaning up test container..."
    docker stop attendance-test-container
    docker rm attendance-test-container
    docker rmi attendance-test
    
else
    echo "❌ Docker build failed!"
fi
