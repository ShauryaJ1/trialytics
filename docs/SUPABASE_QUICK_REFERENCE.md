# Supabase Quick Reference
### Clinical Data Pipeline

## 🔑 Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi... # Keep secret!
DATABASE_URL="postgresql://postgres:...@db.xxxxx.supabase.co:5432/postgres"
```

---

## 📊 Database Tables

| Table | Description | Key Fields |
|-------|-------------|------------|
| `pipeline_jobs` | Track pipeline runs | status, progress, user_id |
| `uploaded_files` | File metadata | filename, file_type, storage_path |
| `adam_datasets` | Generated datasets | dataset_name, record_count |
| `visualizations` | Saved charts | chart_type, chart_config |

---

## 📦 Storage Buckets

| Bucket | Privacy | Purpose |
|--------|---------|---------|
| `uploaded-files` | Private | User uploads (SAP, CSV, SAS) |
| `adam-datasets` | Private | Generated ADaM datasets |
| `visualizations` | Public | Chart images/configs |

---

## 🔐 Common Queries

### Create a Pipeline Job

```typescript
const { data, error } = await supabase
  .from('pipeline_jobs')
  .insert({
    user_id: userId,
    status: 'pending',
    progress: 0,
    metadata: { studyId: 'STUDY-001' }
  })
  .select()
  .single();
```

### Upload a File

```typescript
const { data, error } = await supabase.storage
  .from('uploaded-files')
  .upload(`${userId}/${jobId}/filename.csv`, file);
```

### Update Job Progress

```typescript
await supabase
  .from('pipeline_jobs')
  .update({
    status: 'running',
    progress: 50
  })
  .eq('id', jobId);
```

### Get Job with Files

```typescript
const { data } = await supabase
  .from('pipeline_jobs')
  .select(`
    *,
    uploaded_files (*),
    adam_datasets (*)
  `)
  .eq('id', jobId)
  .single();
```

---

## 🔄 Realtime Subscription

```typescript
const channel = supabase
  .channel('pipeline-updates')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'pipeline_jobs',
      filter: `id=eq.${jobId}`
    },
    (payload) => {
      console.log('Job updated:', payload.new);
    }
  )
  .subscribe();
```

---

## 🔧 Prisma Usage

### Create Job (Type-safe)

```typescript
import { prisma } from '@/lib/prisma';

const job = await prisma.pipelineJob.create({
  data: {
    userId: user.id,
    status: 'pending',
    progress: 0,
  }
});
```

### Find Jobs

```typescript
const jobs = await prisma.pipelineJob.findMany({
  where: { userId: user.id },
  include: {
    uploadedFiles: true,
    adamDatasets: true,
  },
  orderBy: { createdAt: 'desc' },
});
```

---

## 📝 File Type Constants

```typescript
export const FILE_TYPES = {
  SAP: 'sap',
  DATA_CSV: 'data_csv',
  DATA_SAS: 'data_sas',
  CONTEXT: 'context',
} as const;

export const JOB_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;
```

---

## 🚨 Error Handling

```typescript
try {
  const { data, error } = await supabase
    .from('pipeline_jobs')
    .insert(jobData);

  if (error) throw error;

  return data;
} catch (error) {
  console.error('Supabase error:', error);
  // Handle error appropriately
}
```

---

## 📍 Storage URLs

```typescript
// Get public URL
const { data } = supabase.storage
  .from('visualizations')
  .getPublicUrl('path/to/file.png');

// Get signed URL (private)
const { data } = await supabase.storage
  .from('uploaded-files')
  .createSignedUrl('path/to/file.csv', 3600); // 1 hour
```

---

## 🎯 Useful SQL Queries

### Count Jobs by Status

```sql
SELECT status, COUNT(*)
FROM pipeline_jobs
GROUP BY status;
```

### Recent Uploads

```sql
SELECT * FROM uploaded_files
ORDER BY created_at DESC
LIMIT 10;
```

### Jobs with Most Datasets

```sql
SELECT
  pj.id,
  pj.status,
  COUNT(ad.id) as dataset_count
FROM pipeline_jobs pj
LEFT JOIN adam_datasets ad ON pj.id = ad.job_id
GROUP BY pj.id, pj.status
ORDER BY dataset_count DESC;
```

---

## 📱 Dashboard Links

- **Project Dashboard**: https://app.supabase.com/project/[project-id]
- **SQL Editor**: https://app.supabase.com/project/[project-id]/sql
- **Storage**: https://app.supabase.com/project/[project-id]/storage
- **Auth**: https://app.supabase.com/project/[project-id]/auth/users
- **Database**: https://app.supabase.com/project/[project-id]/database/tables

---

## 💡 Pro Tips

1. **Always use RLS policies** - Security by default
2. **Use Prisma for type safety** - Catch errors at build time
3. **Index foreign keys** - Already done in our schema
4. **Use transactions for related operations** - Ensure data consistency
5. **Enable realtime** - For live pipeline updates
6. **Monitor database size** - Free tier has 500MB limit

---

For complete setup instructions, see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
