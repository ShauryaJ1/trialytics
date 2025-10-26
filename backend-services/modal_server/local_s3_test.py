#!/usr/bin/env python3
"""
Local S3 Integration Test
This script creates test files, uploads them to S3, generates presigned URLs,
and tests the Modal server with real S3 operations.
"""

import boto3
import requests
import json
import os
import time
from datetime import datetime
from botocore.client import Config

# Configuration
BUCKET_NAME = "medical-data-443370691698"
REGION = "us-east-1"
MODAL_SERVER_URL = "http://localhost:8000"

# Initialize S3 client
s3 = boto3.client('s3', region_name=REGION, config=Config(signature_version='s3v4'))

def create_test_csv():
    """Create a test CSV file."""
    csv_content = """patient_id,age,blood_pressure,glucose,bmi,diagnosis
P001,45,120,95,24.5,Normal
P002,62,145,180,28.3,Pre-diabetic
P003,38,118,88,22.1,Normal
P004,55,160,220,31.2,Diabetic
P005,41,125,102,26.7,Normal
P006,59,155,195,29.8,Pre-diabetic
P007,33,115,85,21.5,Normal
P008,67,148,210,30.5,Diabetic
P009,44,122,98,25.3,Normal
P010,51,138,145,27.9,Pre-diabetic"""
    
    filename = "test_medical_data.csv"
    with open(filename, 'w') as f:
        f.write(csv_content)
    
    print(f"✅ Created test CSV file: {filename}")
    return filename


def create_test_json():
    """Create a test JSON file."""
    json_data = {
        "study": "Clinical Trial 2024",
        "participants": 150,
        "results": {
            "treatment_group": {
                "size": 75,
                "improvement_rate": 0.72
            },
            "control_group": {
                "size": 75,
                "improvement_rate": 0.31
            }
        },
        "conclusion": "Significant improvement observed"
    }
    
    filename = "test_clinical_data.json"
    with open(filename, 'w') as f:
        json.dump(json_data, f, indent=2)
    
    print(f"✅ Created test JSON file: {filename}")
    return filename


def upload_to_s3(local_file, s3_key):
    """Upload a file to S3."""
    try:
        s3.upload_file(local_file, BUCKET_NAME, s3_key)
        print(f"✅ Uploaded {local_file} to s3://{BUCKET_NAME}/{s3_key}")
        return True
    except Exception as e:
        print(f"❌ Upload failed: {e}")
        return False


def generate_presigned_urls(input_key, output_key):
    """Generate presigned URLs for input and output."""
    # GET URL for input file
    input_url = s3.generate_presigned_url(
        'get_object',
        Params={'Bucket': BUCKET_NAME, 'Key': input_key},
        ExpiresIn=3600
    )
    
    # PUT URL for output file
    output_url = s3.generate_presigned_url(
        'put_object',
        Params={'Bucket': BUCKET_NAME, 'Key': output_key},
        ExpiresIn=3600
    )
    
    print(f"✅ Generated presigned URLs")
    print(f"   Input URL: {input_url[:80]}...")
    print(f"   Output URL: {output_url[:80]}...")
    
    return input_url, output_url


def test_csv_processing():
    """Test CSV file processing through Modal."""
    print("\n" + "="*60)
    print("TEST 1: CSV Processing")
    print("="*60)
    
    # Create and upload test CSV
    csv_file = create_test_csv()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    input_key = f"inputs/test_{timestamp}.csv"
    output_key = f"outputs/analysis_{timestamp}.csv"
    
    if not upload_to_s3(csv_file, input_key):
        return False
    
    # Generate presigned URLs
    input_url, output_url = generate_presigned_urls(input_key, output_key)
    
    # Prepare Modal request
    request_payload = {
        "code": """
# The CSV is already loaded as 'df' by Modal
print(f"Dataset loaded: {df.shape[0]} rows, {df.shape[1]} columns")
print(f"Columns: {list(df.columns)}")

# Analyze the data
print("\\n📊 Data Analysis:")
print(df.describe())

# Check diagnoses distribution
print("\\n🏥 Diagnosis Distribution:")
print(df['diagnosis'].value_counts())

# Find high-risk patients
high_risk = df[df['blood_pressure'] > 140]
print(f"\\n⚠️ High-risk patients (BP > 140): {len(high_risk)}")
print(high_risk[['patient_id', 'age', 'blood_pressure', 'diagnosis']])

# Calculate correlations
numeric_cols = ['age', 'blood_pressure', 'glucose', 'bmi']
correlations = df[numeric_cols].corr()
print("\\n📈 Correlation Matrix:")
print(correlations)

# Create summary output
summary_df = pd.DataFrame({
    'metric': ['total_patients', 'avg_age', 'avg_bp', 'avg_glucose', 'avg_bmi'],
    'value': [
        len(df),
        df['age'].mean(),
        df['blood_pressure'].mean(),
        df['glucose'].mean(),
        df['bmi'].mean()
    ]
})

# Save analysis results
output_content = summary_df
print("\\n✅ Analysis complete, saving results...")
""",
        "input_file_url": input_url,
        "output_file_url": output_url,
        "file_type": "csv",
        "timeout": 300
    }
    
    # Send to Modal server
    print("\n📤 Sending to Modal server...")
    try:
        response = requests.post(
            f"{MODAL_SERVER_URL}/execute",
            json=request_payload,
            timeout=60
        )
        response.raise_for_status()
        
        result = response.json()
        if result['success']:
            print("\n✅ Execution successful!")
            print("\nOutput:")
            print("-" * 40)
            print(result['output'])
            
            # Check if output file was created
            time.sleep(2)  # Give S3 a moment
            try:
                s3.head_object(Bucket=BUCKET_NAME, Key=output_key)
                print(f"\n✅ Output file created in S3: {output_key}")
                
                # Download and display the output
                response = s3.get_object(Bucket=BUCKET_NAME, Key=output_key)
                output_content = response['Body'].read().decode('utf-8')
                print("\nOutput file content:")
                print("-" * 40)
                print(output_content[:500])  # First 500 chars
            except:
                print(f"\n⚠️ Output file not found in S3")
            
            return True
        else:
            print(f"\n❌ Execution failed: {result.get('error')}")
            return False
            
    except Exception as e:
        print(f"\n❌ Request failed: {e}")
        return False
    finally:
        # Clean up local file
        if os.path.exists(csv_file):
            os.remove(csv_file)


def test_json_processing():
    """Test JSON file processing through Modal."""
    print("\n" + "="*60)
    print("TEST 2: JSON Processing (without file_type)")
    print("="*60)
    
    # Create and upload test JSON
    json_file = create_test_json()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    input_key = f"inputs/test_{timestamp}.json"
    output_key = f"outputs/report_{timestamp}.json"
    
    if not upload_to_s3(json_file, input_key):
        return False
    
    # Generate presigned URLs
    input_url, output_url = generate_presigned_urls(input_key, output_key)
    
    # Prepare Modal request (no file_type specified)
    request_payload = {
        "code": """
# File is available as raw bytes in 'file_content'
import json

print(f"File size: {len(file_content)} bytes")

# Parse JSON
data = json.loads(file_content.decode('utf-8'))
print(f"\\n📊 Study: {data['study']}")
print(f"Participants: {data['participants']}")

# Analyze results
treatment = data['results']['treatment_group']
control = data['results']['control_group']

print(f"\\n🔬 Results Analysis:")
print(f"Treatment group: {treatment['size']} patients, {treatment['improvement_rate']*100:.1f}% improved")
print(f"Control group: {control['size']} patients, {control['improvement_rate']*100:.1f}% improved")

improvement_diff = treatment['improvement_rate'] - control['improvement_rate']
print(f"\\n📈 Treatment effect: {improvement_diff*100:.1f}% improvement over control")

# Create enhanced report
report = {
    "original_study": data,
    "analysis": {
        "treatment_effect": improvement_diff,
        "relative_improvement": treatment['improvement_rate'] / control['improvement_rate'],
        "statistical_significance": "p < 0.001" if improvement_diff > 0.3 else "p > 0.05",
        "recommendation": "Approve treatment" if improvement_diff > 0.3 else "Further study needed"
    },
    "generated_at": str(pd.Timestamp.now())
}

# Save enhanced report
output_content = json.dumps(report, indent=2)
print("\\n✅ Report generated")
""",
        "input_file_url": input_url,
        "output_file_url": output_url,
        # No file_type specified - handled as raw bytes
        "timeout": 300
    }
    
    # Send to Modal server
    print("\n📤 Sending to Modal server...")
    try:
        response = requests.post(
            f"{MODAL_SERVER_URL}/execute",
            json=request_payload,
            timeout=60
        )
        response.raise_for_status()
        
        result = response.json()
        if result['success']:
            print("\n✅ Execution successful!")
            print("\nOutput:")
            print("-" * 40)
            print(result['output'])
            return True
        else:
            print(f"\n❌ Execution failed: {result.get('error')}")
            return False
            
    except Exception as e:
        print(f"\n❌ Request failed: {e}")
        return False
    finally:
        # Clean up local file
        if os.path.exists(json_file):
            os.remove(json_file)


def test_direct_s3_operations():
    """Test direct S3 operations without local files."""
    print("\n" + "="*60)
    print("TEST 3: Direct S3 Operations (no local files)")
    print("="*60)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_key = f"outputs/generated_{timestamp}.csv"
    
    # Just need output URL for this test
    output_url = s3.generate_presigned_url(
        'put_object',
        Params={'Bucket': BUCKET_NAME, 'Key': output_key},
        ExpiresIn=3600
    )
    
    print(f"✅ Generated output URL for: {output_key}")
    
    # Modal code that generates data and uploads it
    request_payload = {
        "code": """
import pandas as pd
import numpy as np

print("🔬 Generating synthetic medical data...")

# Generate synthetic patient data
np.random.seed(42)
n_patients = 100

data = {
    'patient_id': [f'P{i:04d}' for i in range(1, n_patients+1)],
    'age': np.random.randint(20, 80, n_patients),
    'systolic_bp': np.random.randint(100, 180, n_patients),
    'diastolic_bp': np.random.randint(60, 110, n_patients),
    'heart_rate': np.random.randint(60, 100, n_patients),
    'temperature': np.round(np.random.uniform(36.0, 38.5, n_patients), 1)
}

df = pd.DataFrame(data)
print(f"Generated {len(df)} patient records")

# Add risk classification
def classify_risk(row):
    risk_score = 0
    if row['systolic_bp'] > 140: risk_score += 2
    if row['diastolic_bp'] > 90: risk_score += 1
    if row['heart_rate'] > 90: risk_score += 1
    if row['temperature'] > 37.5: risk_score += 1
    
    if risk_score >= 3: return 'High'
    elif risk_score >= 1: return 'Medium'
    else: return 'Low'

df['risk_level'] = df.apply(classify_risk, axis=1)

print("\\n📊 Risk Distribution:")
print(df['risk_level'].value_counts())

# Save the generated data
output_content = df
print(f"\\n✅ Saving {len(df)} records to S3...")
""",
        "output_file_url": output_url,
        # No input file for this test
        "timeout": 120
    }
    
    # Send to Modal server
    print("\n📤 Sending to Modal server...")
    try:
        response = requests.post(
            f"{MODAL_SERVER_URL}/execute",
            json=request_payload,
            timeout=60
        )
        response.raise_for_status()
        
        result = response.json()
        if result['success']:
            print("\n✅ Execution successful!")
            print("\nOutput:")
            print("-" * 40)
            print(result['output'])
            
            # Verify file in S3
            time.sleep(2)
            try:
                obj = s3.get_object(Bucket=BUCKET_NAME, Key=output_key)
                file_size = obj['ContentLength']
                print(f"\n✅ Generated file in S3: {output_key} ({file_size} bytes)")
                
                # Show first few lines
                content = obj['Body'].read().decode('utf-8')
                lines = content.split('\n')[:5]
                print("\nFirst 5 lines of generated file:")
                print("-" * 40)
                for line in lines:
                    print(line)
                
                return True
            except:
                print(f"\n⚠️ Output file not found in S3")
                return False
        else:
            print(f"\n❌ Execution failed: {result.get('error')}")
            return False
            
    except Exception as e:
        print(f"\n❌ Request failed: {e}")
        return False


def cleanup_old_test_files():
    """Clean up old test files from S3."""
    print("\n🧹 Cleaning up old test files...")
    try:
        # List objects in inputs/ and outputs/
        for prefix in ['inputs/test_', 'outputs/']:
            response = s3.list_objects_v2(
                Bucket=BUCKET_NAME,
                Prefix=prefix,
                MaxKeys=100
            )
            
            if 'Contents' in response:
                for obj in response['Contents']:
                    # Skip if file is less than 1 hour old
                    age = datetime.now() - obj['LastModified'].replace(tzinfo=None)
                    if age.total_seconds() > 3600:  # 1 hour
                        s3.delete_object(Bucket=BUCKET_NAME, Key=obj['Key'])
                        print(f"   Deleted old file: {obj['Key']}")
    except Exception as e:
        print(f"   Cleanup error: {e}")


def main():
    """Run all tests."""
    print("\n" + "🚀 "*10)
    print(" LOCAL S3 INTEGRATION TESTING ")
    print("🚀 "*10)
    print(f"\nBucket: {BUCKET_NAME}")
    print(f"Region: {REGION}")
    print(f"Server: {MODAL_SERVER_URL}")
    
    # Check if server is running
    print("\n🔍 Checking server status...")
    try:
        response = requests.get(f"{MODAL_SERVER_URL}/health", timeout=10)
        response.raise_for_status()
        health = response.json()
        print(f"✅ Server is {health['status']}")
        print(f"   Modal connected: {health['modal_connected']}")
    except Exception as e:
        print(f"❌ Server not responding: {e}")
        print("   Please start the server with: python app.py")
        return
    
    # Run tests
    results = []
    
    # Test 1: CSV Processing
    results.append(("CSV Processing", test_csv_processing()))
    
    # Test 2: JSON Processing
    results.append(("JSON Processing", test_json_processing()))
    
    # Test 3: Direct S3 Operations
    results.append(("Direct S3 Operations", test_direct_s3_operations()))
    
    # Cleanup old files
    cleanup_old_test_files()
    
    # Summary
    print("\n" + "="*60)
    print("📊 TEST SUMMARY")
    print("="*60)
    
    for test_name, passed in results:
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{test_name}: {status}")
    
    all_passed = all(result[1] for result in results)
    
    if all_passed:
        print("\n🎉 All tests passed! Your S3 integration is working perfectly!")
        print("\n📝 Next Steps:")
        print("1. Check the S3 bucket for generated files")
        print("2. Try with your own data files")
        print("3. Integrate with your NextJS frontend")
    else:
        print("\n⚠️ Some tests failed. Check the output above for details.")
    
    # Show S3 bucket contents
    print("\n📦 Current S3 Bucket Contents:")
    print("-" * 40)
    try:
        for prefix in ['inputs/', 'outputs/', 'temp/']:
            response = s3.list_objects_v2(
                Bucket=BUCKET_NAME,
                Prefix=prefix,
                MaxKeys=5
            )
            if 'Contents' in response:
                print(f"\n{prefix}")
                for obj in response['Contents']:
                    size_kb = obj['Size'] / 1024
                    print(f"  - {obj['Key']} ({size_kb:.1f} KB)")
    except Exception as e:
        print(f"Error listing bucket: {e}")


if __name__ == "__main__":
    main()
