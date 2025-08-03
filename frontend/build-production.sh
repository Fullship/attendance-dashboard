#!/bin/bash

# Production Build Script with Bundle Analysis
# Usage: ./build-production.sh [analyze|size|deploy]

set -e

echo "🏗️  Production Build Script for Attendance Dashboard Frontend"
echo "============================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the frontend directory."
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_warning "node_modules not found. Installing dependencies..."
    npm install
fi

# Clean previous build
print_status "Cleaning previous build..."
rm -rf build/
rm -rf build-stats.json

# Set production environment
export NODE_ENV=production
export GENERATE_SOURCEMAP=false
export INLINE_RUNTIME_CHUNK=false

# Parse command line arguments
COMMAND=${1:-build}

case $COMMAND in
    "analyze")
        print_status "Building with bundle analysis..."
        export ANALYZE=true
        npm run build:analyze
        print_success "Build completed with bundle analyzer!"
        ;;
    
    "size")
        print_status "Building and analyzing bundle size..."
        npm run size
        
        # Additional size analysis
        echo ""
        print_status "Detailed Bundle Size Analysis:"
        echo "=============================="
        
        # Check if build directory exists
        if [ -d "build" ]; then
            # Total build size
            TOTAL_SIZE=$(du -sh build/ | cut -f1)
            print_success "Total build size: $TOTAL_SIZE"
            
            # JavaScript files
            if [ -d "build/static/js" ]; then
                echo ""
                print_status "JavaScript files:"
                ls -lah build/static/js/ | grep -E "\.(js|js\.map)$" | while read line; do
                    echo "  $line"
                done
                
                # Calculate total JS size
                JS_SIZE=$(du -sh build/static/js/ 2>/dev/null | cut -f1 || echo "0B")
                print_status "Total JavaScript size: $JS_SIZE"
            fi
            
            # CSS files
            if [ -d "build/static/css" ]; then
                echo ""
                print_status "CSS files:"
                ls -lah build/static/css/ | grep -E "\.(css|css\.map)$" | while read line; do
                    echo "  $line"
                done
                
                # Calculate total CSS size
                CSS_SIZE=$(du -sh build/static/css/ 2>/dev/null | cut -f1 || echo "0B")
                print_status "Total CSS size: $CSS_SIZE"
            fi
            
            # Check for large files
            echo ""
            print_status "Large files (>500KB):"
            find build/ -type f -size +500k -exec ls -lah {} \; | while read line; do
                print_warning "  $line"
            done
            
            # Gzipped sizes if available
            echo ""
            print_status "Gzipped files:"
            find build/ -name "*.gz" -exec ls -lah {} \; | while read line; do
                echo "  $line"
            done
            
        else
            print_error "Build directory not found!"
            exit 1
        fi
        ;;
    
    "deploy")
        print_status "Building optimized production bundle for deployment..."
        npm run build:prod
        
        # Verify build
        if [ -d "build" ]; then
            print_success "Production build completed successfully!"
            
            # Show build stats
            TOTAL_SIZE=$(du -sh build/ | cut -f1)
            print_status "Build size: $TOTAL_SIZE"
            
            # Count files
            JS_FILES=$(find build/static/js/ -name "*.js" | wc -l)
            CSS_FILES=$(find build/static/css/ -name "*.css" | wc -l)
            print_status "Generated files: $JS_FILES JavaScript, $CSS_FILES CSS"
            
            # Check for essential files
            if [ -f "build/index.html" ]; then
                print_success "✓ index.html generated"
            else
                print_error "✗ index.html missing"
            fi
            
            if [ -f "build/static/js/main.*.js" ]; then
                print_success "✓ Main JavaScript bundle generated"
            else
                print_error "✗ Main JavaScript bundle missing"
            fi
            
            if [ -f "build/static/css/main.*.css" ]; then
                print_success "✓ Main CSS bundle generated"
            else
                print_warning "⚠ Main CSS bundle not found (might be inline)"
            fi
            
            print_success "Build ready for deployment!"
            
        else
            print_error "Build failed!"
            exit 1
        fi
        ;;
    
    "build"|*)
        print_status "Building production bundle..."
        npm run build
        
        if [ -d "build" ]; then
            print_success "Build completed successfully!"
            
            # Quick stats
            TOTAL_SIZE=$(du -sh build/ | cut -f1)
            print_status "Build size: $TOTAL_SIZE"
            
            print_status "To analyze bundle size, run: ./build-production.sh size"
            print_status "To analyze with webpack-bundle-analyzer, run: ./build-production.sh analyze"
        else
            print_error "Build failed!"
            exit 1
        fi
        ;;
esac

echo ""
print_success "Build process completed!"
print_status "Available commands:"
echo "  ./build-production.sh build     - Standard production build"
echo "  ./build-production.sh analyze   - Build with bundle analyzer"
echo "  ./build-production.sh size      - Build with detailed size analysis"
echo "  ./build-production.sh deploy    - Optimized build for deployment"
