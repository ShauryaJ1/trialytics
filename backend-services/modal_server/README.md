# Modal FastAPI Server

A FastAPI server that executes arbitrary Python code in a sandboxed Modal environment.

## Features

- Execute Python code remotely via REST API
- Pre-installed data science packages (pandas, numpy, scipy, matplotlib, scikit-learn, etc.)
- Sandboxed execution environment
- Docker containerization for easy deployment
- AWS EC2 deployment with CloudFormation

## Project Structure

```
modal_server/
├── app.py                 # FastAPI application
├── modal_executor.py      # Modal code execution handler
├── requirements.txt       # Python dependencies
├── Dockerfile            # Container definition
├── .env                  # Modal credentials (not in git)
├── deploy/
│   ├── cloudformation.yaml    # AWS infrastructure
│   └── deploy.sh              # Deployment script
└── README.md             # This file
```

## Local Development

### Prerequisites

- Python 3.11+
- Modal account with API tokens
- Docker (for containerization)

### Setup

1. **Create and activate virtual environment:**
```bash
cd backend-services/modal_server
python -m venv venv
source venv/Scripts/activate  # On Windows Git Bash
# source venv/bin/activate     # On Linux/Mac
```

2. **Install dependencies:**
```bash
pip install -r requirements.txt
```

3. **Configure Modal credentials:**

Create a `.env` file with your Modal tokens:
```
token_id = "ak-YOUR-TOKEN-ID"
token_secret = "as-YOUR-TOKEN-SECRET"
```

4. **Run the server locally:**
```bash
python app.py
# or
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

5. **Access the API:**
- API Documentation: http://localhost:8000/docs
- Health Check: http://localhost:8000/health
- Execute Code: POST http://localhost:8000/execute

## API Usage

### Execute Code Endpoint

**POST** `/execute`

Request body:
```json
{
  "code": "import numpy as np\nprint(np.random.randn(5))",
  "timeout": 120
}
```

Response:
```json
{
  "success": true,
  "output": "[-0.123  0.456  -0.789  0.234  -0.567]\n",
  "error": null,
  "execution_time": null
}
```

### Example with curl:
```bash
curl -X POST http://localhost:8000/execute \
  -H "Content-Type: application/json" \
  -d '{"code": "print(\"Hello from Modal!\")"}'
```

### Example with Python:
```python
import requests

response = requests.post('http://localhost:8000/execute', json={
    'code': '''
import pandas as pd
import numpy as np

df = pd.DataFrame(np.random.randn(5, 3), columns=['A', 'B', 'C'])
print(df)
print(df.describe())
'''
})

print(response.json())
```

## Docker Deployment

### Build Docker Image

```bash
cd backend-services/modal_server
docker build -t modal-server .
```

### Run Docker Container

```bash
docker run -d \
  --name modal-server \
  -p 8000:8000 \
  modal-server
```

## AWS Deployment

### Prerequisites

- AWS CLI configured with appropriate credentials
- EC2 key pair created in your AWS account
- Docker installed locally for building images

### Deploy to AWS

1. **Navigate to the deployment directory:**
```bash
cd backend-services/modal_server/deploy
```

2. **Make the deployment script executable:**
```bash
chmod +x deploy.sh
```

3. **Run the deployment:**
```bash
./deploy.sh --key-name YOUR-KEY-NAME --region us-east-1
```

The script will:
1. Build the Docker image
2. Create an ECR repository
3. Push the image to ECR
4. Deploy the CloudFormation stack
5. Output the API endpoint and SSH details

### Deployment Options

```bash
./deploy.sh --help  # Show all options

# Custom deployment
./deploy.sh \
  --key-name my-key \
  --region us-west-2 \
  --stack-name my-modal-stack \
  --image-tag v1.0.0
```

### CloudFormation Stack Details

- **Instance Type:** t3a.medium (2 vCPUs, 4 GB RAM)
- **Storage:** 30 GB gp3 EBS volume
- **OS:** Ubuntu 22.04 LTS
- **Ports:** 22 (SSH), 80 (HTTP), 8000 (FastAPI)
- **Features:** 
  - Elastic IP for persistent addressing
  - ECR integration for Docker image storage
  - Auto-restart on failure via systemd

### Accessing the Deployed Server

After deployment, you'll receive:
- Public IP address
- API endpoint URL
- Swagger documentation URL
- SSH command

Test the deployed server:
```bash
curl -X POST http://YOUR-IP:8000/execute \
  -H "Content-Type: application/json" \
  -d '{"code": "print(\"Hello from AWS!\")"}'
```

## Available Python Packages

The Modal execution environment includes:
- pandas
- numpy
- scipy
- matplotlib
- seaborn
- scikit-learn
- plotly
- requests
- beautifulsoup4

## Security Considerations

⚠️ **Important Security Notes:**

1. **Code Execution:** This server executes arbitrary Python code. Modal provides sandboxing, but always consider security implications.

2. **Authentication:** The current implementation has no authentication. For production use, consider adding:
   - API key authentication
   - OAuth2 / JWT tokens
   - IP whitelisting

3. **Network Security:** The CloudFormation template opens ports to 0.0.0.0/0. Restrict these in production.

4. **Secrets Management:** The .env file is included in the Docker image. For production, use:
   - AWS Secrets Manager
   - Environment variables passed at runtime
   - EC2 IAM roles

## Monitoring and Logs

### Local Logs
```bash
# View FastAPI logs
python app.py

# Docker logs
docker logs modal-server
```

### AWS Logs
```bash
# SSH into the instance
ssh -i ~/.ssh/YOUR-KEY.pem ubuntu@YOUR-IP

# View Docker logs
sudo docker logs modal-server

# View setup logs
cat /var/log/setup.log
```

## Troubleshooting

### Modal Connection Issues

1. Verify Modal tokens in .env file
2. Check Modal dashboard for quota/limits
3. Test with: `curl http://localhost:8000/health`

### Docker Build Issues

```bash
# Clean Docker cache
docker system prune -a

# Rebuild with no cache
docker build --no-cache -t modal-server .
```

### AWS Deployment Issues

1. Verify AWS credentials: `aws sts get-caller-identity`
2. Check CloudFormation events in AWS Console
3. Ensure EC2 key pair exists in the target region

## Development Tips

1. **Testing Code Execution:**
   Visit http://localhost:8000/examples for pre-built examples

2. **Adding Packages:**
   Edit `modal_executor.py` and add packages to the Modal image:
   ```python
   image = modal.Image.debian_slim(python_version="3.11").pip_install(
       "new-package",
       # ... existing packages
   )
   ```

3. **Adjusting Limits:**
   Modify in `modal_executor.py`:
   - `timeout`: Execution time limit
   - `memory`: RAM allocation
   - `cpu`: CPU cores

## License

Internal use only. Contains proprietary Modal API credentials.

## Support

For issues or questions, please check the logs first:
- Local: FastAPI console output
- Docker: `docker logs modal-server`
- AWS: SSH and check `/var/log/setup.log`
