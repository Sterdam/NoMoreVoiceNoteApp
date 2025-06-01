#!/bin/bash

set -e

echo "🚀 Starting production environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a variable is set
check_env_var() {
    if [ -z "${!1}" ]; then
        echo -e "${RED}❌ Error: $1 is not set${NC}"
        return 1
    else
        echo -e "${GREEN}✅ $1 is set${NC}"
        return 0
    fi
}

# Function to check if a service is healthy
check_service() {
    local service=$1
    local max_attempts=30
    local attempt=1
    
    echo -e "${YELLOW}Checking $service health...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose -f docker-compose.prod.yml ps | grep -q "$service.*healthy"; then
            echo -e "${GREEN}✅ $service is healthy${NC}"
            return 0
        fi
        
        echo "Waiting for $service... (attempt $attempt/$max_attempts)"
        sleep 2
        ((attempt++))
    done
    
    echo -e "${RED}❌ $service failed to become healthy${NC}"
    return 1
}

echo "1. Checking environment variables..."

# Required environment variables
required_vars=(
    "NODE_ENV"
    "PORT"
    "MONGODB_URI"
    "REDIS_URL"
    "JWT_SECRET"
    "COOKIE_SECRET"
    "CRYPTO_KEY"
    "OPENAI_API_KEY"
    "STRIPE_SECRET_KEY"
    "STRIPE_WEBHOOK_SECRET"
    "STRIPE_BASIC_PRICE_ID"
    "STRIPE_PRO_PRICE_ID"
    "STRIPE_ENTERPRISE_PRICE_ID"
)

# Check all required variables
all_vars_set=true
for var in "${required_vars[@]}"; do
    if ! check_env_var "$var"; then
        all_vars_set=false
    fi
done

if [ "$all_vars_set" = false ]; then
    echo -e "${RED}❌ Some required environment variables are missing!${NC}"
    echo "Please check your .env file"
    exit 1
fi

echo -e "${GREEN}✅ All required environment variables are set${NC}"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo "Please create a .env file based on .env.example"
    exit 1
fi

echo "2. Building Docker images..."
docker-compose -f docker-compose.prod.yml build

echo "3. Starting services..."
docker-compose -f docker-compose.prod.yml up -d mongodb redis

# Wait for MongoDB and Redis to be healthy
echo "4. Waiting for databases to be ready..."
check_service "mongodb" || exit 1
check_service "redis" || exit 1

echo "5. Running database initialization..."
# Run database initialization if needed
docker-compose -f docker-compose.prod.yml run --rm app node src/utils/dbInit.js || true

echo "6. Preloading Whisper models..."
# Create models directory if it doesn't exist
docker-compose -f docker-compose.prod.yml run --rm app mkdir -p /app/models

# Preload Whisper models
echo "Downloading Whisper models (this may take a while on first run)..."
docker-compose -f docker-compose.prod.yml run --rm app node -e "
const { loadModel } = require('./src/config/whisperInit');
(async () => {
    try {
        console.log('Loading Whisper model...');
        await loadModel();
        console.log('✅ Whisper model loaded successfully');
    } catch (error) {
        console.error('❌ Error loading Whisper model:', error);
        process.exit(1);
    }
})();
"

echo "7. Building frontend..."
# Build frontend if dist directory doesn't exist
if [ ! -d "./frontend/dist" ]; then
    echo "Building frontend assets..."
    cd frontend
    npm install
    npm run build
    cd ..
fi

echo "8. Starting all services..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for app to be healthy
check_service "whatsapp-transcriber" || exit 1

echo "9. Setting up SSL certificates (if needed)..."
if [ ! -d "./certbot/conf/live" ]; then
    echo -e "${YELLOW}SSL certificates not found. Run ./scripts/setup-ssl.sh to configure SSL${NC}"
fi

echo "10. Checking application health..."
sleep 5

# Check if the application is responding
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Application is running and healthy!${NC}"
else
    echo -e "${RED}❌ Application health check failed${NC}"
    echo "Checking logs..."
    docker-compose -f docker-compose.prod.yml logs --tail=50 app
    exit 1
fi

echo -e "${GREEN}🎉 Production environment started successfully!${NC}"
echo ""
echo "Services status:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "To view logs:"
echo "  docker-compose -f docker-compose.prod.yml logs -f [service_name]"
echo ""
echo "To stop all services:"
echo "  docker-compose -f docker-compose.prod.yml down"
echo ""

# If FRONTEND_URL is set, show the URL
if [ ! -z "$FRONTEND_URL" ]; then
    echo "Application should be available at: $FRONTEND_URL"
fi