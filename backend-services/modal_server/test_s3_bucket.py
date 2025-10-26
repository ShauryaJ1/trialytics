#!/usr/bin/env python3
"""
Quick S3 bucket test - verify bucket is accessible and configured correctly.
"""

import boto3
import json
from botocore.client import Config

# Configuration
BUCKET_NAME = "medical-data-443370691698"
REGION = "us-east-1"

def test_bucket():
    """Test S3 bucket access and configuration."""
    
    # Create S3 client
    s3 = boto3.client('s3', region_name=REGION, config=Config(signature_version='s3v4'))
    
    print(f"Testing S3 bucket: {BUCKET_NAME}")
    print("=" * 60)
    
    # 1. Check bucket exists and is accessible
    try:
        s3.head_bucket(Bucket=BUCKET_NAME)
        print("✅ Bucket exists and is accessible")
    except Exception as e:
        print(f"❌ Cannot access bucket: {e}")
        return
    
    # 2. Test file upload
    try:
        test_content = "Hello from Modal S3 integration test!"
        s3.put_object(
            Bucket=BUCKET_NAME,
            Key="test/test_file.txt",
            Body=test_content.encode('utf-8')
        )
        print("✅ Successfully uploaded test file")
    except Exception as e:
        print(f"❌ Upload failed: {e}")
        return
    
    # 3. Generate presigned URLs
    try:
        # GET URL for downloading
        get_url = s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': BUCKET_NAME, 'Key': 'test/test_file.txt'},
            ExpiresIn=3600
        )
        print("✅ Generated presigned GET URL")
        print(f"   Preview: {get_url[:100]}...")
        
        # PUT URL for uploading
        put_url = s3.generate_presigned_url(
            'put_object',
            Params={'Bucket': BUCKET_NAME, 'Key': 'outputs/result.csv'},
            ExpiresIn=3600
        )
        print("✅ Generated presigned PUT URL")
        print(f"   Preview: {put_url[:100]}...")
        
    except Exception as e:
        print(f"❌ Failed to generate presigned URLs: {e}")
        return
    
    # 4. Test download
    try:
        response = s3.get_object(Bucket=BUCKET_NAME, Key='test/test_file.txt')
        content = response['Body'].read().decode('utf-8')
        if content == test_content:
            print("✅ Successfully downloaded and verified test file")
        else:
            print("❌ Downloaded content doesn't match")
    except Exception as e:
        print(f"❌ Download failed: {e}")
    
    # 5. Check CORS configuration
    try:
        cors = s3.get_bucket_cors(Bucket=BUCKET_NAME)
        print("✅ CORS is configured")
        print(f"   Allowed origins: {cors['CORSRules'][0]['AllowedOrigins']}")
    except Exception as e:
        print(f"⚠️  CORS not configured: {e}")
    
    # 6. Check lifecycle configuration
    try:
        lifecycle = s3.get_bucket_lifecycle_configuration(Bucket=BUCKET_NAME)
        print("✅ Lifecycle policies are configured")
        for rule in lifecycle.get('Rules', []):
            print(f"   - {rule['ID']}: Delete {rule['Prefix']} after {rule['Expiration']['Days']} days")
    except Exception as e:
        print(f"⚠️  Lifecycle not configured: {e}")
    
    # Clean up test file
    try:
        s3.delete_object(Bucket=BUCKET_NAME, Key='test/test_file.txt')
        print("✅ Cleaned up test file")
    except:
        pass
    
    print("\n" + "=" * 60)
    print("🎉 S3 Bucket Configuration Summary:")
    print(f"   Bucket Name: {BUCKET_NAME}")
    print(f"   Region: {REGION}")
    print(f"   URL: https://{BUCKET_NAME}.s3.{REGION}.amazonaws.com")
    print("\n📝 Add to your NextJS .env.local:")
    print(f"   S3_BUCKET_NAME={BUCKET_NAME}")
    print(f"   AWS_REGION={REGION}")
    print("=" * 60)


if __name__ == "__main__":
    test_bucket()
