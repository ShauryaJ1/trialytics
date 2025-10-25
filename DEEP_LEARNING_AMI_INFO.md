# AWS Deep Learning AMI Configuration

## Overview

This deployment now uses the **AWS Deep Learning Base GPU AMI (Ubuntu 22.04)** instead of the standard Ubuntu AMI. This provides a pre-configured environment optimized for machine learning and deep learning workloads.

## Key Changes

### AMI Details
- **AMI ID (us-east-1)**: `ami-07e05a9b31a088ae5`
- **Base OS**: Ubuntu 22.04 LTS
- **Region**: US-EAST-1 ONLY (configured for this specific region)

### Pre-installed Components

The Deep Learning AMI comes with everything pre-installed and configured:

#### GPU Support
- ✅ NVIDIA drivers (latest stable version)
- ✅ CUDA 12.x toolkit
- ✅ cuDNN 8.x
- ✅ NVIDIA Container Toolkit for Docker
- ✅ GPU monitoring tools (nvidia-smi, nvtop)

#### ML/DL Frameworks
- ✅ PyTorch (latest stable with CUDA support)
- ✅ TensorFlow 2.x (with GPU support)
- ✅ JAX
- ✅ MXNet
- ✅ Hugging Face Transformers

#### Development Environment
- ✅ Conda with pre-configured environments
- ✅ Jupyter Lab/Notebook
- ✅ Docker CE with NVIDIA runtime
- ✅ Python 3.10+
- ✅ Essential Python libraries (NumPy, Pandas, scikit-learn, etc.)

## Benefits Over Standard Ubuntu AMI

1. **Time Savings**: No need to install NVIDIA drivers, CUDA, or frameworks
2. **Compatibility**: All components are tested to work together
3. **Optimized**: AWS-optimized builds for better performance
4. **Ready-to-Use**: Can start training models immediately after launch

## Simplified Setup

Since everything is pre-installed, the UserData script is much simpler:

```bash
#!/bin/bash
# System update
apt-get update && apt-get upgrade -y

# Ensure Docker is enabled (already installed)
systemctl enable docker
systemctl restart docker

# Install monitoring tools
apt-get install -y htop nvtop tmux

# Everything else is already installed!
```

## Quick Test Commands

After deploying, verify your setup:

```bash
# Check GPU
nvidia-smi

# Check CUDA version
nvcc --version

# Test PyTorch
python3 -c "import torch; print(torch.cuda.is_available())"

# Test TensorFlow
python3 -c "import tensorflow as tf; print(len(tf.config.list_physical_devices('GPU')))"

# Run GPU Docker container
docker run --rm --gpus all nvidia/cuda:12.0-base nvidia-smi
```

## Working with Conda Environments

The AMI includes pre-configured Conda environments:

```bash
# List available environments
conda env list

# Activate PyTorch environment
conda activate pytorch

# Activate TensorFlow environment
conda activate tensorflow2

# Create your own environment
conda create -n myenv python=3.10
conda activate myenv
```

## vLLM Deployment Example

Perfect for running vLLM with the pre-installed environment:

```bash
# Using Docker (recommended)
docker run --runtime nvidia --gpus all \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  -p 8080:8000 \
  vllm/vllm-openai:latest \
  --model meta-llama/Llama-2-7b-chat-hf

# Or install vLLM directly
pip install vllm
python -m vllm.entrypoints.openai.api_server \
  --model meta-llama/Llama-2-7b-chat-hf \
  --port 8080
```

## Cost Considerations

The Deep Learning AMI is **free** - you only pay for:
- EC2 instance costs (g6e.xlarge: ~$1.20/hour on-demand)
- EBS storage (100GB GP3: ~$8/month)
- Elastic IP (free when attached to running instance)
- Data transfer costs

## Troubleshooting

### GPU not detected
```bash
# Restart Docker daemon
sudo systemctl restart docker

# Check NVIDIA runtime
docker info | grep nvidia

# Verify kernel modules
lsmod | grep nvidia
```

### Framework import errors
```bash
# Make sure you're in the right conda environment
conda activate pytorch  # or tensorflow2

# Update conda
conda update -n base -c defaults conda
```

### Out of GPU memory
```bash
# Check what's using GPU memory
nvidia-smi

# Kill specific process
kill -9 <PID>

# Clear GPU memory cache (PyTorch)
python3 -c "import torch; torch.cuda.empty_cache()"
```

## Updates and Maintenance

The Deep Learning AMI is regularly updated by AWS. To get the latest AMI ID:

```bash
aws ec2 describe-images \
  --owners amazon \
  --filters "Name=name,Values=Deep Learning Base*GPU*Ubuntu*22.04*" \
  --query 'Images | sort_by(@, &CreationDate) | [-1].[ImageId,Name,CreationDate]' \
  --output text \
  --region us-east-1
```

## Additional Resources

- [AWS Deep Learning AMI Documentation](https://docs.aws.amazon.com/dlami/latest/devguide/what-is-dlami.html)
- [Release Notes](https://docs.aws.amazon.com/dlami/latest/devguide/appendix-ami-release-notes.html)
- [Framework Tutorials](https://docs.aws.amazon.com/dlami/latest/devguide/tutorials.html)
