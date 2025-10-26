#!/bin/bash

# S3 Bucket Setup Script for Modal File Processing
# This script creates and configures an S3 bucket for file uploads/downloads

BUCKET_NAME="${1:-medical-data-processing}"  # Default name, can override
REGION="${2:-us-east-1}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}📦 $1${NC}"
}

print_info "Setting up S3 bucket: $BUCKET_NAME in region $REGION"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS credentials are not configured. Please run 'aws configure' first."
    exit 1
fi

# Create bucket
print_info "Creating S3 bucket..."
if [ "$REGION" = "us-east-1" ]; then
    # us-east-1 doesn't need LocationConstraint
    aws s3api create-bucket --bucket $BUCKET_NAME --region $REGION 2>/dev/null
else
    aws s3api create-bucket \
        --bucket $BUCKET_NAME \
        --region $REGION \
        --create-bucket-configuration LocationConstraint=$REGION 2>/dev/null
fi

if [ $? -eq 0 ]; then
    print_success "Bucket created successfully"
else
    # Check if bucket already exists
    if aws s3api head-bucket --bucket $BUCKET_NAME 2>/dev/null; then
        print_info "Bucket already exists, continuing with configuration..."
    else
        print_error "Failed to create bucket"
        exit 1
    fi
fi

# Configure CORS for browser uploads
print_info "Configuring CORS..."
cat > cors.json << EOF
{
    "CORSRules": [{
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
        "AllowedOrigins": ["http://localhost:3000", "http://localhost:3001", "*"],
        "ExposeHeaders": ["ETag", "Content-Length", "x-amz-request-id"],
        "MaxAgeSeconds": 3000
    }]
}
EOF

aws s3api put-bucket-cors --bucket $BUCKET_NAME --cors-configuration file://cors.json

if [ $? -eq 0 ]; then
    print_success "CORS configured successfully"
else
    print_error "Failed to configure CORS"
fi

# Set lifecycle policy for temp files
print_info "Setting lifecycle policy for temporary files..."
cat > lifecycle.json << EOF
{
    "Rules": [
        {
            "ID": "DeleteTempFiles",
            "Status": "Enabled",
            "Prefix": "temp/",
            "Expiration": {"Days": 1}
        },
        {
            "ID": "DeleteOldOutputs",
            "Status": "Enabled",
            "Prefix": "outputs/",
            "Expiration": {"Days": 30}
        }
    ]
}
EOF

aws s3api put-bucket-lifecycle-configuration --bucket $BUCKET_NAME --lifecycle-configuration file://lifecycle.json

if [ $? -eq 0 ]; then
    print_success "Lifecycle policy configured successfully"
else
    print_error "Failed to configure lifecycle policy"
fi

# Create folder structure (these are just key prefixes in S3)
print_info "Creating folder structure..."
echo "" | aws s3 cp - s3://$BUCKET_NAME/inputs/.keep
echo "" | aws s3 cp - s3://$BUCKET_NAME/outputs/.keep
echo "" | aws s3 cp - s3://$BUCKET_NAME/temp/.keep

# Clean up temporary files
rm -f cors.json lifecycle.json

# Display configuration summary
echo ""
echo "=========================================="
print_success "S3 Bucket Configuration Complete!"
echo "=========================================="
echo ""
echo "Bucket Name: $BUCKET_NAME"
echo "Region: $REGION"
echo "Bucket URL: https://$BUCKET_NAME.s3.$REGION.amazonaws.com"
echo ""
echo "📝 Add the following to your NextJS .env.local:"
echo ""
echo "  S3_BUCKET_NAME=$BUCKET_NAME"
echo "  AWS_REGION=$REGION"
echo ""
echo "📂 Folder Structure:"
echo "  - inputs/   (for input files)"
echo "  - outputs/  (for processed results)"
echo "  - temp/     (auto-deleted after 1 day)"
echo ""
echo "🔒 Security Notes:"
echo "  - Use presigned URLs for secure file access"
echo "  - Never expose AWS credentials in client code"
echo "  - Consider enabling S3 versioning for important data"
echo ""
