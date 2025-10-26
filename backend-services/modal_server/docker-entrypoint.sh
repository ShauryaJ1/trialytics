#!/bin/bash
# Docker entrypoint script for Modal FastAPI server
# This script handles Modal deployment and server startup

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Load environment variables from .env file if it exists
if [ -f /app/.env ]; then
    log_info "Loading environment variables from .env file..."
    # Parse .env file safely (format: token_id = value)
    if grep -q "token_id" /app/.env 2>/dev/null; then
        # Updated to handle .env without quotes and strip Windows line endings
        MODAL_TOKEN_ID=$(grep "token_id" /app/.env | cut -d'=' -f2 | tr -d ' ' | tr -d '\r')
        MODAL_TOKEN_SECRET=$(grep "token_secret" /app/.env | cut -d'=' -f2 | tr -d ' ' | tr -d '\r')
        export MODAL_TOKEN_ID
        export MODAL_TOKEN_SECRET
    fi
fi

# Check for Modal credentials
if [ -z "$MODAL_TOKEN_ID" ] && [ -n "$token_id" ]; then
    export MODAL_TOKEN_ID="${token_id}"
fi

if [ -z "$MODAL_TOKEN_SECRET" ] && [ -n "$token_secret" ]; then
    export MODAL_TOKEN_SECRET="${token_secret}"
fi

# Control Modal deployment via environment variable
DEPLOY_MODAL="${DEPLOY_MODAL:-true}"
MODAL_DEPLOY_TIMEOUT="${MODAL_DEPLOY_TIMEOUT:-60}"

# Deploy Modal functions if enabled and credentials are available
if [ "$DEPLOY_MODAL" = "true" ]; then
    if [ -n "$MODAL_TOKEN_ID" ] && [ -n "$MODAL_TOKEN_SECRET" ]; then
        log_info "🚀 Deploying Modal functions..."
        log_info "This ensures the latest package definitions are active..."
        
        # Use timeout to prevent hanging
        if timeout $MODAL_DEPLOY_TIMEOUT modal deploy /app/modal_executor.py; then
            log_success "✅ Modal functions deployed successfully!"
            log_info "All packages including pdfplumber should now be available."
        else
            log_error "⚠️  Modal deployment failed or timed out"
            log_info "Continuing with server startup (Modal functions may use cached version)"
        fi
    else
        log_error "Modal credentials not found. Skipping Modal deployment."
        log_info "Set MODAL_TOKEN_ID and MODAL_TOKEN_SECRET to enable deployment."
    fi
else
    log_info "Modal deployment disabled (DEPLOY_MODAL=$DEPLOY_MODAL)"
fi

# Start the FastAPI server
log_info "🌐 Starting FastAPI server on port 8000..."
exec uvicorn app:app --host 0.0.0.0 --port 8000 --log-level info