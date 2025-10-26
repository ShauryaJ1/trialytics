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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Generate unique keys for S3
    const timestamp = new Date().getTime();
    const inputKey = `inputs/${timestamp}_${file.name}`;

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

    // Generate presigned GET URL for the uploaded file
    const presignedUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({ Bucket: BUCKET_NAME, Key: inputKey }),
      { expiresIn: 3600 } // 1 hour
    );

    return NextResponse.json({
      success: true,
      bucketName: BUCKET_NAME,
      key: inputKey,
      presignedUrl,
      s3Uri: `s3://${BUCKET_NAME}/${inputKey}`,
      fileSize: file.size,
      fileName: file.name,
      message: 'File uploaded successfully to S3'
    });

  } catch (error) {
    console.error('S3 upload error:', error);
    return NextResponse.json(
      { 
        error: 'Upload failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
