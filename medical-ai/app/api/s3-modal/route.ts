import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'medical-data-443370691698';
const MODAL_SERVER_URL = process.env.MODAL_SERVER_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const code = formData.get('code') as string;
    const fileType = formData.get('fileType') as string;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Generate unique keys for S3
    const timestamp = new Date().getTime();
    const inputKey = `inputs/${timestamp}_${file.name}`;
    const outputKey = `outputs/${timestamp}_result.${fileType === 'csv' ? 'csv' : 'txt'}`;

    // Get file content as buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload file to S3
    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: inputKey,
      Body: buffer,
      ContentType: file.type,
    }));

    // Generate presigned URLs
    const inputUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({ Bucket: BUCKET_NAME, Key: inputKey }),
      { expiresIn: 3600 }
    );

    const outputUrl = await getSignedUrl(
      s3Client,
      new PutObjectCommand({ Bucket: BUCKET_NAME, Key: outputKey }),
      { expiresIn: 3600 }
    );

    // Send to Modal server - WITHOUT the S3 parameters (user code will handle it)
    const modalResponse = await fetch(`${MODAL_SERVER_URL}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: code || getDefaultCode(fileType, inputUrl), // Pass URL to generate default code
        timeout: 300,
        // NOT passing input_file_url, output_file_url, or file_type
        // User's code will handle the file loading directly
      }),
    });

    const modalResult = await modalResponse.json();

    // If successful and output was created, generate a download URL
    let downloadUrl = null;
    if (modalResult.success && modalResult.output?.includes('Successfully uploaded to S3')) {
      downloadUrl = await getSignedUrl(
        s3Client,
        new GetObjectCommand({ Bucket: BUCKET_NAME, Key: outputKey }),
        { expiresIn: 3600 }
      );
    }

    return NextResponse.json({
      ...modalResult,
      inputKey,
      outputKey,
      downloadUrl,
      bucketName: BUCKET_NAME,
      inputPresignedUrl: inputUrl, // Return the presigned URL for transparency
    });

  } catch (error) {
    console.error('S3 Modal processing error:', error);
    return NextResponse.json(
      { 
        error: 'Processing failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

function getDefaultCode(fileType: string, presignedUrl: string): string {
  switch (fileType) {
    case 'csv':
      return `import requests
import pandas as pd
import io

# Download file from S3 presigned URL
url = "${presignedUrl}"
print("Downloading CSV from S3...")
response = requests.get(url)
response.raise_for_status()
file_content = response.content
print(f"Downloaded {len(file_content)} bytes")

# Load CSV into DataFrame
df = pd.read_csv(io.BytesIO(file_content))
print(f"Dataset shape: {df.shape}")
print(f"Columns: {list(df.columns)}")
print("\\nFirst 5 rows:")
print(df.head())
print("\\nStatistics:")
print(df.describe())

# Save summary as output
output_content = df.describe()
`;
    case 'xpt':
      return `import requests
import pyreadstat
import io

# Download file from S3 presigned URL
url = "${presignedUrl}"
print("Downloading XPT from S3...")
response = requests.get(url)
response.raise_for_status()
file_content = response.content
print(f"Downloaded {len(file_content)} bytes")

# Load XPT file
df, meta = pyreadstat.read_xport(io.BytesIO(file_content))
print(f"Dataset shape: {df.shape}")
if hasattr(meta, 'file_label'):
    print(f"File label: {meta.file_label}")
print("\\nColumns:", list(df.columns))
print("\\nFirst 5 rows:")
print(df.head())

# Convert to CSV for output
output_content = df
`;
    case 'pdf':
      return `import requests
import PyPDF2
import io

# Download file from S3 presigned URL
url = "${presignedUrl}"
print("Downloading PDF from S3...")
response = requests.get(url)
response.raise_for_status()
file_content = response.content
print(f"Downloaded {len(file_content)} bytes")

# Load PDF
pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
num_pages = len(pdf_reader.pages)
print(f"PDF has {num_pages} pages")

# Extract text from all pages
all_text = []
for i, page in enumerate(pdf_reader.pages):
    text = page.extract_text()
    all_text.append(f"Page {i+1}:\\n{text}\\n")
    print(f"Page {i+1}: {len(text)} characters")

# Save extracted text
output_content = "\\n".join(all_text)
`;
    default:
      return `import requests

# Download file from S3 presigned URL
url = "${presignedUrl}"
print("Downloading file from S3...")
response = requests.get(url)
response.raise_for_status()
file_content = response.content
print(f"Downloaded {len(file_content)} bytes")

# Process the file as needed
try:
    text = file_content.decode('utf-8')
    print(f"Text length: {len(text)} characters")
    print("First 500 characters:")
    print(text[:500])
    output_content = text.upper()  # Example transformation
except:
    print("Unable to decode as text")
    output_content = str(file_content[:1000])
`;
  }
}
