#!/bin/bash

# Quick S3 Test Script
# Tests the Modal server with a simple CSV file

BUCKET="medical-data-443370691698"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "🚀 Quick S3 Integration Test"
echo "================================"

# 1. Create a test CSV
echo "Creating test CSV..."
cat > test.csv << EOF
name,age,score
Alice,25,85
Bob,30,92
Charlie,35,88
Diana,28,95
EOF

# 2. Upload to S3
echo "Uploading to S3..."
aws s3 cp test.csv s3://$BUCKET/inputs/test_$TIMESTAMP.csv

# 3. Generate presigned URLs
echo "Generating presigned URLs..."
INPUT_URL=$(aws s3 presign s3://$BUCKET/inputs/test_$TIMESTAMP.csv --expires-in 3600)
OUTPUT_URL=$(aws s3 presign s3://$BUCKET/outputs/result_$TIMESTAMP.csv --expires-in 3600 --no-sign-request)

# 4. Create the request
echo "Testing with Modal server..."
curl -X POST http://localhost:8000/execute \
  -H "Content-Type: application/json" \
  -d @- << EOF
{
  "code": "print(df.head())\\nprint('\\nStatistics:')\\nprint(df.describe())\\noutput_content = df.describe()",
  "input_file_url": "$INPUT_URL",
  "output_file_url": "$OUTPUT_URL",
  "file_type": "csv",
  "timeout": 60
}
EOF

echo ""
echo "================================"
echo "✅ Test complete!"
echo "Check output at: s3://$BUCKET/outputs/result_$TIMESTAMP.csv"

# Clean up
rm test.csv
