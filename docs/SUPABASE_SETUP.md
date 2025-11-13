# Supabase Setup Guide
### For SDTM-to-ADaM Clinical Data Pipeline

This guide walks you through setting up Supabase for your clinical data transformation pipeline.

---

## Table of Contents

1. [Create Supabase Project](#1-create-supabase-project)
2. [Database Schema](#2-database-schema)
3. [Storage Buckets](#3-storage-buckets)
4. [Authentication Setup](#4-authentication-setup)
5. [Environment Variables](#5-environment-variables)
6. [Prisma Integration](#6-prisma-integration)
7. [Testing the Setup](#7-testing-the-setup)

---

## 1. Create Supabase Project

### Step 1: Sign Up/Login to Supabase

1. Go to [https://supabase.com](https://supabase.com)
2. Click **"Start your project"**
3. Sign in with GitHub (recommended for easy integration)

### Step 2: Create a New Project

1. Click **"New Project"**
2. Fill in the details:
   - **Name**: `clinical-data-pipeline` (or your preferred name)
   - **Database Password**: Generate a strong password (SAVE THIS!)
   - **Region**: Choose closest to you (e.g., `us-east-1`)
   - **Pricing Plan**: Free tier is fine to start

3. Click **"Create new project"**
4. Wait 2-3 minutes for the project to be provisioned

### Step 3: Get Your Project Credentials

Once the project is ready:

1. Go to **Settings** → **API**
2. Copy these values (you'll need them later):
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (keep this SECRET!)

3. Go to **Settings** → **Database**
4. Copy the **Connection String** (select "URI" mode):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
   ```

---

## 2. Database Schema

### Tables Overview

We need these tables for the pipeline:

| Table | Purpose |
|-------|---------|
| `users` | User accounts (handled by Supabase Auth) |
| `pipeline_jobs` | Track pipeline execution jobs |
| `uploaded_files` | Metadata for uploaded files |
| `adam_datasets` | Generated ADaM dataset records |
| `visualizations` | Saved visualization configs |

### Create Tables Using SQL Editor

1. Go to **SQL Editor** in Supabase dashboard
2. Click **"New query"**
3. Paste and run this SQL:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Pipeline Jobs Table
CREATE TABLE pipeline_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Uploaded Files Table
CREATE TABLE uploaded_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES pipeline_jobs(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'sap', 'data_csv', 'data_sas', 'context'
  file_size BIGINT NOT NULL,
  storage_path TEXT NOT NULL, -- Path in Supabase Storage
  upload_status TEXT DEFAULT 'uploading' CHECK (upload_status IN ('uploading', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ADaM Datasets Table
CREATE TABLE adam_datasets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES pipeline_jobs(id) ON DELETE CASCADE,
  dataset_name TEXT NOT NULL, -- 'ADSL', 'ADAE', 'ADVS', 'ADLB'
  record_count INTEGER NOT NULL,
  storage_path TEXT NOT NULL, -- Path to generated dataset in storage
  format TEXT DEFAULT 'csv' CHECK (format IN ('csv', 'rda', 'sas7bdat')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Visualizations Table (for saved charts)
CREATE TABLE visualizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES pipeline_jobs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  chart_type TEXT NOT NULL, -- 'bar', 'line', 'pie', etc.
  chart_config JSONB NOT NULL, -- Chart.js configuration
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_pipeline_jobs_user_id ON pipeline_jobs(user_id);
CREATE INDEX idx_pipeline_jobs_status ON pipeline_jobs(status);
CREATE INDEX idx_uploaded_files_job_id ON uploaded_files(job_id);
CREATE INDEX idx_adam_datasets_job_id ON adam_datasets(job_id);
CREATE INDEX idx_visualizations_job_id ON visualizations(job_id);

-- Enable Row Level Security (RLS)
ALTER TABLE pipeline_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE adam_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE visualizations ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only see their own data)
CREATE POLICY "Users can view their own jobs" ON pipeline_jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own jobs" ON pipeline_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs" ON pipeline_jobs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own files" ON uploaded_files
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can upload files" ON uploaded_files
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view datasets from their jobs" ON adam_datasets
  FOR SELECT USING (
    job_id IN (SELECT id FROM pipeline_jobs WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view their own visualizations" ON visualizations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create visualizations" ON visualizations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their visualizations" ON visualizations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their visualizations" ON visualizations
  FOR DELETE USING (auth.uid() = user_id);
```

4. Click **"Run"** to execute

---

## 3. Storage Buckets

### Create Storage Buckets

1. Go to **Storage** in Supabase dashboard
2. Click **"New bucket"**

#### Bucket 1: Uploaded Files
- **Name**: `uploaded-files`
- **Public**: ❌ (Private)
- Click **"Create bucket"**

#### Bucket 2: ADaM Datasets
- **Name**: `adam-datasets`
- **Public**: ❌ (Private)
- Click **"Create bucket"**

#### Bucket 3: Visualizations
- **Name**: `visualizations`
- **Public**: ✅ (Public - for sharing charts)
- Click **"Create bucket"**

### Set Storage Policies

For each bucket, click the **⋮** menu → **"Manage policies"**

**For `uploaded-files` and `adam-datasets` (Private):**

```sql
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'uploaded-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to read their own files
CREATE POLICY "Users can read own files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'uploaded-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'uploaded-files' AND auth.uid()::text = (storage.foldername(name))[1]);
```

**For `visualizations` (Public):**

```sql
-- Allow anyone to read
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'visualizations');

-- Authenticated users can upload
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'visualizations');
```

---

## 4. Authentication Setup

### Enable Email Authentication

1. Go to **Authentication** → **Settings**
2. Under **Email Auth**, ensure it's enabled
3. Configure email templates if needed

### Optional: Enable OAuth Providers

For GitHub/Google login:

1. Go to **Authentication** → **Providers**
2. Enable **GitHub** or **Google**
3. Follow the setup instructions for each provider

---

## 5. Environment Variables

### Create `.env.local` for Next.js

In your project root, create `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... # SECRET!

# Database (for Prisma)
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres"

# Local LLM
LOCAL_LLM_ENDPOINT=http://localhost:11434
LOCAL_LLM_MODEL=llama2

# Backend API (if separate)
BACKEND_URL=http://localhost:8000
```

### Add to `.gitignore`

Make sure `.env.local` is in your `.gitignore`:

```gitignore
.env.local
.env*.local
```

---

## 6. Prisma Integration

### Install Prisma

```bash
npm install prisma @prisma/client
npx prisma init
```

### Update `prisma/schema.prisma`

Replace the content with:

```prisma
// This is your Prisma schema file

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model PipelineJob {
  id            String         @id @default(uuid()) @db.Uuid
  userId        String         @map("user_id") @db.Uuid
  status        String
  progress      Int            @default(0)
  startedAt     DateTime       @default(now()) @map("started_at")
  completedAt   DateTime?      @map("completed_at")
  errorMessage  String?        @map("error_message")
  metadata      Json           @default("{}")
  createdAt     DateTime       @default(now()) @map("created_at")
  updatedAt     DateTime       @default(now()) @updatedAt @map("updated_at")

  uploadedFiles UploadedFile[]
  adamDatasets  AdamDataset[]
  visualizations Visualization[]

  @@index([userId])
  @@index([status])
  @@map("pipeline_jobs")
}

model UploadedFile {
  id            String       @id @default(uuid()) @db.Uuid
  userId        String       @map("user_id") @db.Uuid
  jobId         String       @map("job_id") @db.Uuid
  filename      String
  fileType      String       @map("file_type")
  fileSize      BigInt       @map("file_size")
  storagePath   String       @map("storage_path")
  uploadStatus  String       @default("uploading") @map("upload_status")
  createdAt     DateTime     @default(now()) @map("created_at")

  job           PipelineJob  @relation(fields: [jobId], references: [id], onDelete: Cascade)

  @@index([jobId])
  @@map("uploaded_files")
}

model AdamDataset {
  id           String       @id @default(uuid()) @db.Uuid
  jobId        String       @map("job_id") @db.Uuid
  datasetName  String       @map("dataset_name")
  recordCount  Int          @map("record_count")
  storagePath  String       @map("storage_path")
  format       String       @default("csv")
  metadata     Json         @default("{}")
  createdAt    DateTime     @default(now()) @map("created_at")

  job          PipelineJob  @relation(fields: [jobId], references: [id], onDelete: Cascade)

  @@index([jobId])
  @@map("adam_datasets")
}

model Visualization {
  id          String       @id @default(uuid()) @db.Uuid
  jobId       String       @map("job_id") @db.Uuid
  userId      String       @map("user_id") @db.Uuid
  title       String
  chartType   String       @map("chart_type")
  chartConfig Json         @map("chart_config")
  createdAt   DateTime     @default(now()) @map("created_at")
  updatedAt   DateTime     @default(now()) @updatedAt @map("updated_at")

  job         PipelineJob  @relation(fields: [jobId], references: [id], onDelete: Cascade)

  @@index([jobId])
  @@map("visualizations")
}
```

### Generate Prisma Client

```bash
npx prisma generate
npx prisma db pull  # Pull existing schema from Supabase
```

---

## 7. Testing the Setup

### Test Database Connection

Create `test-supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  // Test insert
  const { data, error } = await supabase
    .from('pipeline_jobs')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Connection failed:', error);
  } else {
    console.log('✅ Connection successful!');
    console.log('Data:', data);
  }
}

testConnection();
```

Run it:
```bash
npx tsx test-supabase.ts
```

### Test Storage

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function testStorage() {
  // Test upload
  const { data, error } = await supabase.storage
    .from('uploaded-files')
    .upload('test/hello.txt', new Blob(['Hello, World!']));

  if (error) {
    console.error('❌ Upload failed:', error);
  } else {
    console.log('✅ Upload successful!');
    console.log('Path:', data.path);
  }
}

testStorage();
```

---

## Summary Checklist

- [ ] Supabase project created
- [ ] Database tables created (pipeline_jobs, uploaded_files, etc.)
- [ ] Storage buckets created (uploaded-files, adam-datasets, visualizations)
- [ ] RLS policies set up
- [ ] Authentication enabled
- [ ] Environment variables configured
- [ ] Prisma schema updated and generated
- [ ] Connection tested successfully

---

## Next Steps

1. **Install Supabase client in your Next.js project:**
   ```bash
   npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
   ```

2. **Set up tRPC routers** that use Prisma to interact with Supabase

3. **Create file upload functionality** using Supabase Storage

4. **Implement real-time pipeline progress** using Supabase Realtime

---

## Useful Links

- [Supabase Dashboard](https://app.supabase.com)
- [Supabase Docs](https://supabase.com/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Next.js + Supabase Guide](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)

---

**Need help?** Check the troubleshooting section or ask in the project chat!
