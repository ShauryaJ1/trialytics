#!/bin/bash

# Deploy script for g6e.xlarge instance with AWS Deep Learning AMI and Elastic IP
# NOTE: This script is configured for US-EAST-1 region only
# Usage: ./deploy-g6e-instance.sh

set -e

echo "=============================================="
echo "G6E.XLARGE DEEP LEARNING INSTANCE DEPLOYMENT"
echo "=============================================="
echo "Region: US-EAST-1 (N. Virginia) ONLY"
echo "AMI: AWS Deep Learning Base GPU (Ubuntu 22.04)"
echo "=============================================="

# Function to check if AWS CLI is installed
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        echo "AWS CLI is not installed. Please install it first."
        exit 1
    fi
}

# Function to set region to us-east-1 (only supported region)
get_region() {
    REGION="us-east-1"
    echo "Using region: $REGION (Deep Learning AMI only available in us-east-1)"
    
    # Check if user's default region is different
    USER_REGION=$(aws configure get region)
    if [ ! -z "$USER_REGION" ] && [ "$USER_REGION" != "us-east-1" ]; then
        echo "WARNING: Your default region is $USER_REGION but this deployment uses us-east-1"
        read -p "Continue with us-east-1? (y/n): " CONTINUE
        if [ "$CONTINUE" != "y" ]; then
            echo "Deployment cancelled."
            exit 1
        fi
    fi
}

# Function to list key pairs
list_key_pairs() {
    echo "Available EC2 Key Pairs:"
    aws ec2 describe-key-pairs --query 'KeyPairs[*].KeyName' --output table
}

# Function to deploy with CloudFormation
deploy_cloudformation() {
    echo ""
    echo "Deploying with CloudFormation (creates new VPC, subnet, security group, etc.)"
    echo "============================================================================"
    
    # Get stack name
    read -p "Enter stack name (default: g6e-instance-stack): " STACK_NAME
    STACK_NAME=${STACK_NAME:-g6e-instance-stack}
    
    # Get instance name
    read -p "Enter instance name (default: g6e-xlarge-instance): " INSTANCE_NAME
    INSTANCE_NAME=${INSTANCE_NAME:-g6e-xlarge-instance}
    
    # List available key pairs
    list_key_pairs
    read -p "Enter EC2 Key Pair name: " KEY_NAME
    
    # Security settings
    echo ""
    echo "Security Group Configuration:"
    read -p "Enable SSH (22) access? (y/n, default: y): " ENABLE_SSH
    ENABLE_SSH=${ENABLE_SSH:-y}
    ENABLE_SSH=$([ "$ENABLE_SSH" = "y" ] && echo "true" || echo "false")
    
    read -p "Enable HTTP (80) access? (y/n, default: y): " ENABLE_HTTP
    ENABLE_HTTP=${ENABLE_HTTP:-y}
    ENABLE_HTTP=$([ "$ENABLE_HTTP" = "y" ] && echo "true" || echo "false")
    
    read -p "Enable HTTPS (443) access? (y/n, default: y): " ENABLE_HTTPS
    ENABLE_HTTPS=${ENABLE_HTTPS:-y}
    ENABLE_HTTPS=$([ "$ENABLE_HTTPS" = "y" ] && echo "true" || echo "false")
    
    read -p "Additional port to open (e.g., 8080 for vLLM, 0 to skip): " ADD_PORT
    ADD_PORT=${ADD_PORT:-8080}
    
    # Deploy stack
    echo ""
    echo "Deploying CloudFormation stack..."
    aws cloudformation create-stack \
        --stack-name "$STACK_NAME" \
        --template-body file://g6e-instance-vpc-stack.yaml \
        --parameters \
            ParameterKey=KeyName,ParameterValue="$KEY_NAME" \
            ParameterKey=InstanceName,ParameterValue="$INSTANCE_NAME" \
            ParameterKey=EnableSSH,ParameterValue="$ENABLE_SSH" \
            ParameterKey=EnableHTTP,ParameterValue="$ENABLE_HTTP" \
            ParameterKey=EnableHTTPS,ParameterValue="$ENABLE_HTTPS" \
            ParameterKey=AdditionalPort,ParameterValue="$ADD_PORT" \
        --region "$REGION"
    
    echo "Stack creation initiated. Waiting for completion..."
    aws cloudformation wait stack-create-complete --stack-name "$STACK_NAME" --region "$REGION"
    
    echo ""
    echo "Stack created successfully!"
    echo ""
    
    # Get outputs
    echo "Stack Outputs:"
    aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --query 'Stacks[0].Outputs' \
        --output table \
        --region "$REGION"
    
    # Get Elastic IP
    ELASTIC_IP=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --query 'Stacks[0].Outputs[?OutputKey==`PublicIP`].OutputValue' \
        --output text \
        --region "$REGION")
    
    echo ""
    echo "======================================"
    echo "DEPLOYMENT COMPLETE!"
    echo "======================================"
    echo "Instance is ready at: $ELASTIC_IP"
    echo "SSH Command: ssh -i ~/.ssh/${KEY_NAME}.pem ubuntu@${ELASTIC_IP}"
    echo ""
}

# Function to deploy with Launch Template (using existing VPC)
deploy_launch_template() {
    echo ""
    echo "Deploying with Launch Template (using existing VPC)"
    echo "===================================================="
    
    # Get the Deep Learning AMI (us-east-1 only)
    get_deeplearning_ami() {
        # AWS Deep Learning Base GPU AMI (Ubuntu 22.04)
        AMI="ami-07e05a9b31a088ae5"
        echo "Using Deep Learning Base GPU AMI: $AMI"
    }
    
    get_deeplearning_ami
    
    # List VPCs
    echo "Available VPCs:"
    aws ec2 describe-vpcs --query 'Vpcs[*].[VpcId,CidrBlock,Tags[?Key==`Name`].Value|[0]]' --output table
    read -p "Enter VPC ID: " VPC_ID
    
    # List subnets in the VPC
    echo "Available Subnets in VPC $VPC_ID:"
    aws ec2 describe-subnets \
        --filters "Name=vpc-id,Values=$VPC_ID" \
        --query 'Subnets[*].[SubnetId,CidrBlock,AvailabilityZone,Tags[?Key==`Name`].Value|[0]]' \
        --output table
    read -p "Enter Subnet ID (should be a public subnet): " SUBNET_ID
    
    # List security groups
    echo "Available Security Groups in VPC $VPC_ID:"
    aws ec2 describe-security-groups \
        --filters "Name=vpc-id,Values=$VPC_ID" \
        --query 'SecurityGroups[*].[GroupId,GroupName,Description]' \
        --output table
    read -p "Enter Security Group ID: " SG_ID
    
    # List key pairs
    list_key_pairs
    read -p "Enter EC2 Key Pair name: " KEY_NAME
    
    # Get instance name
    read -p "Enter instance name (default: g6e-xlarge-instance): " INSTANCE_NAME
    INSTANCE_NAME=${INSTANCE_NAME:-g6e-xlarge-instance}
    
    # Create launch template if it doesn't exist
    TEMPLATE_NAME="g6e-xlarge-deeplearning-template-${REGION}"
    
    # Check if template exists
    if aws ec2 describe-launch-templates --launch-template-names "$TEMPLATE_NAME" &>/dev/null; then
        echo "Launch template $TEMPLATE_NAME already exists."
        read -p "Create new version? (y/n): " CREATE_VERSION
        if [ "$CREATE_VERSION" = "y" ]; then
            VERSION="\$Latest"
        else
            VERSION="\$Latest"
        fi
    else
        echo "Creating launch template..."
        # Update the JSON file with correct values
        sed "s/ami-0e2c8caa4b6378d8c/$AMI/g; s/YOUR-KEY-NAME/$KEY_NAME/g; s/YOUR-SECURITY-GROUP-ID/$SG_ID/g" \
            g6e-launch-template.json > temp-launch-template.json
        
        aws ec2 create-launch-template \
            --launch-template-name "$TEMPLATE_NAME" \
            --launch-template-data file://temp-launch-template.json \
            --region "$REGION"
        
        rm temp-launch-template.json
        VERSION="\$Latest"
    fi
    
    # Launch instance
    echo "Launching instance..."
    INSTANCE_ID=$(aws ec2 run-instances \
        --launch-template LaunchTemplateName="$TEMPLATE_NAME",Version="$VERSION" \
        --subnet-id "$SUBNET_ID" \
        --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$INSTANCE_NAME}]" \
        --query 'Instances[0].InstanceId' \
        --output text \
        --region "$REGION")
    
    echo "Instance $INSTANCE_ID launched. Waiting for it to be running..."
    aws ec2 wait instance-running --instance-ids "$INSTANCE_ID" --region "$REGION"
    
    # Allocate and associate Elastic IP
    echo "Allocating Elastic IP..."
    ALLOCATION_ID=$(aws ec2 allocate-address --domain vpc --query 'AllocationId' --output text --region "$REGION")
    ELASTIC_IP=$(aws ec2 describe-addresses --allocation-ids "$ALLOCATION_ID" --query 'Addresses[0].PublicIp' --output text --region "$REGION")
    
    echo "Associating Elastic IP with instance..."
    aws ec2 associate-address \
        --instance-id "$INSTANCE_ID" \
        --allocation-id "$ALLOCATION_ID" \
        --region "$REGION"
    
    echo ""
    echo "======================================"
    echo "DEPLOYMENT COMPLETE!"
    echo "======================================"
    echo "Instance ID: $INSTANCE_ID"
    echo "Elastic IP: $ELASTIC_IP"
    echo "SSH Command: ssh -i ~/.ssh/${KEY_NAME}.pem ubuntu@${ELASTIC_IP}"
    echo ""
}

# Function to create just the launch template
create_template_only() {
    echo ""
    echo "Creating Deep Learning Launch Template Only"
    echo "==========================================="
    
    get_deeplearning_ami() {
        # AWS Deep Learning Base GPU AMI (Ubuntu 22.04)
        AMI="ami-07e05a9b31a088ae5"
        echo "Using Deep Learning Base GPU AMI: $AMI"
    }
    
    get_deeplearning_ami
    
    TEMPLATE_NAME="g6e-xlarge-deeplearning-template-${REGION}"
    
    # Check if template exists
    if aws ec2 describe-launch-templates --launch-template-names "$TEMPLATE_NAME" &>/dev/null; then
        echo "Launch template $TEMPLATE_NAME already exists in region $REGION"
        read -p "Do you want to create a new version? (y/n): " CREATE_VERSION
        if [ "$CREATE_VERSION" != "y" ]; then
            echo "Exiting without changes."
            exit 0
        fi
    fi
    
    # Create launch template
    echo "Creating launch template with AMI $AMI..."
    
    # Create template with placeholder values
    cat > temp-launch-template.json <<EOF
{
  "LaunchTemplateName": "$TEMPLATE_NAME",
  "VersionDescription": "g6e.xlarge instance with AWS Deep Learning Base GPU AMI (Ubuntu 22.04) for us-east-1",
  "LaunchTemplateData": {
    "InstanceType": "g6e.xlarge",
    "ImageId": "$AMI",
    "BlockDeviceMappings": [
      {
        "DeviceName": "/dev/sda1",
        "Ebs": {
          "VolumeSize": 100,
          "VolumeType": "gp3",
          "DeleteOnTermination": true,
          "Iops": 3000,
          "Throughput": 125
        }
      }
    ],
    "TagSpecifications": [
      {
        "ResourceType": "instance",
        "Tags": [
          {
            "Key": "Type",
            "Value": "g6e-xlarge"
          },
          {
            "Key": "OS",
            "Value": "Ubuntu-22.04"
          }
        ]
      }
    ],
    "UserData": "$(base64 -w 0 <<'USERDATA'
#!/bin/bash
# Update system
apt-get update
apt-get upgrade -y

# Install Docker
apt-get install -y docker.io
systemctl start docker
systemctl enable docker

# Install NVIDIA Container Toolkit
distribution=$(. /etc/os-release;echo \$ID\$VERSION_ID)
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/\$distribution/libnvidia-container.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
apt-get update
apt-get install -y nvidia-container-toolkit
nvidia-ctk runtime configure --runtime=docker
systemctl restart docker

# Install AWS CLI
apt-get install -y awscli

# Create setup complete marker
touch /tmp/setup-complete
USERDATA
)"
  }
}
EOF
    
    aws ec2 create-launch-template \
        --cli-input-json file://temp-launch-template.json \
        --region "$REGION"
    
    rm temp-launch-template.json
    
    echo ""
    echo "Launch template created successfully!"
    echo "Template Name: $TEMPLATE_NAME"
    echo ""
    echo "To use this template, run:"
    echo "aws ec2 run-instances --launch-template LaunchTemplateName=$TEMPLATE_NAME --subnet-id <SUBNET-ID> --security-group-ids <SG-ID> --key-name <KEY-NAME>"
    echo ""
}

# Main script
main() {
    check_aws_cli
    get_region
    
    echo ""
    echo "Deployment Options:"
    echo "1. Deploy with CloudFormation (creates new VPC, recommended)"
    echo "2. Deploy with Launch Template (uses existing VPC)"
    echo "3. Create Launch Template only (for later use)"
    echo "4. Exit"
    echo ""
    
    read -p "Choose option (1-4): " OPTION
    
    case $OPTION in
        1)
            deploy_cloudformation
            ;;
        2)
            deploy_launch_template
            ;;
        3)
            create_template_only
            ;;
        4)
            echo "Exiting..."
            exit 0
            ;;
        *)
            echo "Invalid option"
            exit 1
            ;;
    esac
}

# Run main function
main
