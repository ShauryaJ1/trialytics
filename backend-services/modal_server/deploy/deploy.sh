#!/bin/bash

# Modal FastAPI Server Deployment Script
# This script builds the Docker image, pushes it to ECR, and deploys the CloudFormation stack

set -e  # Exit on error

# Configuration
REGION=${AWS_REGION:-"us-east-1"}
STACK_NAME=${STACK_NAME:-"modal-server-stack"}
ECR_REPO_NAME=${ECR_REPO_NAME:-"modal-server"}
IMAGE_TAG=${IMAGE_TAG:-"latest"}
KEY_NAME=${KEY_NAME:-""}  # EC2 key pair name

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}→ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install it first."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials are not configured. Please run 'aws configure'."
        exit 1
    fi
    
    # Check if KEY_NAME is provided
    if [ -z "$KEY_NAME" ]; then
        print_error "EC2 key pair name is required. Set KEY_NAME environment variable or edit this script."
        echo "Available key pairs:"
        aws ec2 describe-key-pairs --query 'KeyPairs[].KeyName' --output table --region $REGION
        exit 1
    fi
    
    print_success "Prerequisites check completed"
}

# Get AWS account ID
get_aws_account_id() {
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    print_success "AWS Account ID: $AWS_ACCOUNT_ID"
}

# Create ECR repository if it doesn't exist
create_ecr_repository() {
    print_info "Creating/checking ECR repository..."
    
    if aws ecr describe-repositories --repository-names $ECR_REPO_NAME --region $REGION &> /dev/null; then
        print_success "ECR repository '$ECR_REPO_NAME' already exists"
    else
        aws ecr create-repository \
            --repository-name $ECR_REPO_NAME \
            --region $REGION \
            --image-scanning-configuration scanOnPush=true \
            --encryption-configuration encryptionType=AES256
        print_success "ECR repository '$ECR_REPO_NAME' created"
    fi
    
    ECR_URI="$AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$ECR_REPO_NAME"
    print_success "ECR URI: $ECR_URI"
}

# Build Docker image
build_docker_image() {
    print_info "Building Docker image..."
    
    # Go to the modal_server directory (parent of deploy/)
    cd ..
    
    # Build the image
    docker build -t $ECR_REPO_NAME:$IMAGE_TAG .
    
    print_success "Docker image built successfully"
}

# Push Docker image to ECR
push_to_ecr() {
    print_info "Pushing Docker image to ECR..."
    
    # Login to ECR
    aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com
    
    # Tag the image
    docker tag $ECR_REPO_NAME:$IMAGE_TAG $ECR_URI:$IMAGE_TAG
    
    # Push the image
    docker push $ECR_URI:$IMAGE_TAG
    
    print_success "Docker image pushed to ECR"
}

# Deploy CloudFormation stack
deploy_cloudformation() {
    print_info "Deploying CloudFormation stack..."
    
    # Go back to deploy directory
    cd deploy
    
    # Check if stack exists
    if aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION &> /dev/null; then
        # Update existing stack
        print_info "Updating existing stack..."
        aws cloudformation update-stack \
            --stack-name $STACK_NAME \
            --template-body file://cloudformation.yaml \
            --parameters \
                ParameterKey=KeyName,ParameterValue=$KEY_NAME \
                ParameterKey=ECRRepositoryName,ParameterValue=$ECR_REPO_NAME \
                ParameterKey=ImageTag,ParameterValue=$IMAGE_TAG \
            --capabilities CAPABILITY_IAM \
            --region $REGION
        
        print_info "Waiting for stack update to complete..."
        aws cloudformation wait stack-update-complete --stack-name $STACK_NAME --region $REGION
        print_success "Stack updated successfully"
    else
        # Create new stack
        print_info "Creating new stack..."
        aws cloudformation create-stack \
            --stack-name $STACK_NAME \
            --template-body file://cloudformation.yaml \
            --parameters \
                ParameterKey=KeyName,ParameterValue=$KEY_NAME \
                ParameterKey=ECRRepositoryName,ParameterValue=$ECR_REPO_NAME \
                ParameterKey=ImageTag,ParameterValue=$IMAGE_TAG \
            --capabilities CAPABILITY_IAM \
            --region $REGION
        
        print_info "Waiting for stack creation to complete (this may take a few minutes)..."
        aws cloudformation wait stack-create-complete --stack-name $STACK_NAME --region $REGION
        print_success "Stack created successfully"
    fi
}

# Get stack outputs
get_stack_outputs() {
    print_info "Getting stack outputs..."
    
    # Get outputs as JSON
    OUTPUTS=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $REGION \
        --query 'Stacks[0].Outputs' \
        --output json)
    
    # Parse and display outputs
    echo ""
    echo "=========================================="
    echo "Deployment Complete!"
    echo "=========================================="
    
    # Extract specific outputs
    PUBLIC_IP=$(echo $OUTPUTS | python3 -c "import sys, json; outputs = json.load(sys.stdin); print([o['OutputValue'] for o in outputs if o['OutputKey'] == 'PublicIP'][0])")
    API_ENDPOINT=$(echo $OUTPUTS | python3 -c "import sys, json; outputs = json.load(sys.stdin); print([o['OutputValue'] for o in outputs if o['OutputKey'] == 'APIEndpoint'][0])")
    SSH_COMMAND=$(echo $OUTPUTS | python3 -c "import sys, json; outputs = json.load(sys.stdin); print([o['OutputValue'] for o in outputs if o['OutputKey'] == 'SSHCommand'][0])")
    
    echo ""
    print_success "Public IP: $PUBLIC_IP"
    print_success "API Endpoint: $API_ENDPOINT"
    print_success "Swagger Docs: $API_ENDPOINT/docs"
    print_success "SSH Command: $SSH_COMMAND"
    echo ""
    echo "Test the API with:"
    echo "  curl -X POST $API_ENDPOINT/execute \\"
    echo "    -H 'Content-Type: application/json' \\"
    echo "    -d '{\"code\": \"print(\\\"Hello from Modal!\\\")\"}'"
    echo ""
}

# Cleanup function (optional)
cleanup() {
    print_info "Cleaning up temporary files..."
    # Add any cleanup commands here if needed
}

# Main execution
main() {
    echo "=========================================="
    echo "Modal FastAPI Server Deployment"
    echo "=========================================="
    echo ""
    
    check_prerequisites
    get_aws_account_id
    create_ecr_repository
    build_docker_image
    push_to_ecr
    deploy_cloudformation
    get_stack_outputs
    
    print_success "Deployment completed successfully!"
}

# Handle script interruption
trap cleanup EXIT

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --region)
            REGION="$2"
            shift 2
            ;;
        --stack-name)
            STACK_NAME="$2"
            shift 2
            ;;
        --key-name)
            KEY_NAME="$2"
            shift 2
            ;;
        --image-tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --region REGION         AWS region (default: us-east-1)"
            echo "  --stack-name NAME       CloudFormation stack name (default: modal-server-stack)"
            echo "  --key-name NAME         EC2 key pair name (required)"
            echo "  --image-tag TAG         Docker image tag (default: latest)"
            echo "  --help                  Show this help message"
            echo ""
            echo "Example:"
            echo "  $0 --key-name my-key --region us-west-2"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Run main function
main
