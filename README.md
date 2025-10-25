# G6E.XLARGE Instance Deployment with AWS Deep Learning AMI

This repository contains CloudFormation templates and scripts to automatically deploy g6e.xlarge instances with AWS Deep Learning Base GPU AMI (Ubuntu 22.04) in a public subnet configuration with Elastic IP.

## Features

- ✅ **g6e.xlarge instance** with NVIDIA L40S GPU
- ✅ **AWS Deep Learning AMI** (Ubuntu 22.04 base) with:
  - Pre-installed NVIDIA drivers (latest version)
  - CUDA toolkit and cuDNN
  - PyTorch, TensorFlow, and MXNet frameworks
  - Conda environments for ML workflows
  - Docker with NVIDIA Container Toolkit configured
- ✅ **Public subnet** with Internet Gateway routing
- ✅ **Elastic IP** for persistent public address
- ✅ **Configurable security groups** (SSH, HTTP, HTTPS, custom ports)
- ✅ **100GB GP3 SSD** with optimized IOPS

## Region Support

⚠️ **IMPORTANT**: This template is configured for **US-EAST-1 (N. Virginia) ONLY** to use the latest Deep Learning AMI.

## Files Included

1. **`g6e-instance-vpc-stack.yaml`** - Complete CloudFormation template that creates:
   - VPC with DNS enabled
   - Internet Gateway
   - Public subnet
   - Route table with internet gateway route
   - Security group with configurable ports
   - g6e.xlarge EC2 instance
   - Elastic IP associated with the instance

2. **`g6e-launch-template.json`** - EC2 Launch Template for use with existing VPCs

3. **`deploy-g6e-instance.sh`** - Interactive deployment script with options to:
   - Deploy complete stack with CloudFormation
   - Launch instance in existing VPC
   - Create reusable launch template

## Quick Start

### Prerequisites

- AWS CLI installed and configured (`aws configure`)
- Valid EC2 Key Pair in your AWS account
- Appropriate IAM permissions for EC2, VPC, and CloudFormation

### Option 1: Automated Deployment Script (Recommended)

```bash
# Make the script executable
chmod +x deploy-g6e-instance.sh

# Run the deployment script
./deploy-g6e-instance.sh
```

The script will guide you through:
1. Choosing deployment method (new VPC or existing VPC)
2. Selecting your EC2 key pair
3. Configuring security group rules
4. Deploying the instance with Elastic IP

### Option 2: CloudFormation CLI Deployment

```bash
# Deploy the stack
aws cloudformation create-stack \
  --stack-name my-g6e-stack \
  --template-body file://g6e-instance-vpc-stack.yaml \
  --parameters \
    ParameterKey=KeyName,ParameterValue=your-key-name \
    ParameterKey=InstanceName,ParameterValue=my-g6e-instance \
    ParameterKey=EnableSSH,ParameterValue=true \
    ParameterKey=EnableHTTP,ParameterValue=true \
    ParameterKey=EnableHTTPS,ParameterValue=true \
    ParameterKey=AdditionalPort,ParameterValue=8080

# Wait for completion
aws cloudformation wait stack-create-complete --stack-name my-g6e-stack

# Get the Elastic IP
aws cloudformation describe-stacks \
  --stack-name my-g6e-stack \
  --query 'Stacks[0].Outputs[?OutputKey==`PublicIP`].OutputValue' \
  --output text
```

### Option 3: Launch Template with Existing VPC

```bash
# First, create the launch template
aws ec2 create-launch-template \
  --launch-template-name g6e-ubuntu-template \
  --launch-template-data file://g6e-launch-template.json

# Launch an instance (replace with your subnet and security group)
INSTANCE_ID=$(aws ec2 run-instances \
  --launch-template LaunchTemplateName=g6e-ubuntu-template \
  --subnet-id subnet-xxxxx \
  --security-group-ids sg-xxxxx \
  --key-name your-key-name \
  --query 'Instances[0].InstanceId' \
  --output text)

# Allocate and associate Elastic IP
ALLOCATION_ID=$(aws ec2 allocate-address --domain vpc --query 'AllocationId' --output text)
aws ec2 associate-address --instance-id $INSTANCE_ID --allocation-id $ALLOCATION_ID
```

## Connecting to Your Instance

Once deployed, connect via SSH:

```bash
ssh -i ~/.ssh/your-key-name.pem ubuntu@<elastic-ip>
```

### Verify GPU and Frameworks

After connecting, verify everything is working:

```bash
# Check GPU
nvidia-smi

# Test PyTorch GPU
python3 -c "import torch; print(f'PyTorch: {torch.__version__}'); print(f'CUDA available: {torch.cuda.is_available()}')"

# Test TensorFlow GPU
python3 -c "import tensorflow as tf; print(f'TensorFlow: {tf.__version__}'); print(f'GPUs: {len(tf.config.list_physical_devices(\"GPU\"))}')"

# Check Docker GPU support
docker run --rm --gpus all nvidia/cuda:12.0-base nvidia-smi

# List Conda environments
conda env list
```

## Customization

### CloudFormation Parameters

- `KeyName` - EC2 key pair for SSH access
- `InstanceName` - Name tag for the instance
- `EnableSSH` - Allow SSH access (port 22)
- `EnableHTTP` - Allow HTTP access (port 80)
- `EnableHTTPS` - Allow HTTPS access (port 443)
- `AdditionalPort` - Custom port (e.g., 8080 for vLLM)

### Deep Learning AMI Details

The AWS Deep Learning Base GPU AMI includes:

**Pre-installed Frameworks:**
- PyTorch (latest stable)
- TensorFlow 2.x
- MXNet
- JAX

**GPU Support:**
- NVIDIA drivers (latest version)
- CUDA 12.x toolkit
- cuDNN 8.x
- NVIDIA Container Toolkit for Docker

**Development Tools:**
- Conda with pre-configured environments
- Jupyter Lab/Notebook
- Docker CE with GPU support
- AWS CLI and boto3
- Git, tmux, htop, nvtop

**Python Libraries:**
- NumPy, SciPy, Pandas
- Matplotlib, Seaborn
- scikit-learn
- OpenCV
- Hugging Face Transformers


## Cost Considerations

**g6e.xlarge pricing** (approximate, varies by region):
- On-Demand: ~$1.20/hour
- Spot: ~$0.40-0.60/hour (when available)

**Additional costs:**
- Elastic IP: Free while attached to running instance
- Data transfer: Standard AWS rates apply
- EBS storage: 100GB GP3 volume

## Cleanup

To delete all resources and avoid charges:

```bash
# Delete the CloudFormation stack
aws cloudformation delete-stack --stack-name my-g6e-stack

# Or manually release Elastic IP if using launch template
aws ec2 release-address --allocation-id <allocation-id>
```

## Security Notes

- Default security group allows SSH from anywhere (0.0.0.0/0)
- Modify security group rules based on your requirements
- Consider using Systems Manager Session Manager for enhanced security
- Always use strong key pairs and rotate them regularly

## Troubleshooting

### Instance not accessible
- Verify security group allows your IP for SSH
- Check route table has 0.0.0.0/0 → Internet Gateway route
- Ensure Elastic IP is properly associated

### GPU not available
- Allow 5-10 minutes for NVIDIA drivers to install
- Check `/tmp/setup-complete` exists
- Run `nvidia-smi` to verify GPU access

## Support for vLLM

The template is optimized for running vLLM:
- Port 8080 is opened by default
- NVIDIA Container Toolkit pre-installed
- Ready for vLLM Docker deployment

Example vLLM deployment:
```bash
docker run --runtime nvidia --gpus all \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  -p 8080:8000 \
  vllm/vllm-openai:latest \
  --model meta-llama/Llama-2-7b-chat-hf
```

## License

MIT License - Feel free to modify and use as needed.
