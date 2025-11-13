# Clinical Data Pipeline Documentation

Documentation for the SDTM-to-ADaM clinical data transformation web application.

---

## 📚 Documentation Index

### Setup Guides

1. **[Supabase Setup](./SUPABASE_SETUP.md)** - Complete guide to setting up your Supabase project
   - Database schema
   - Storage buckets
   - Authentication
   - Prisma integration

2. **[Supabase Quick Reference](./SUPABASE_QUICK_REFERENCE.md)** - Quick reference for common operations
   - Environment variables
   - Common queries
   - Code snippets
   - Dashboard links

---

## 🛠 Tech Stack

| Technology | Purpose | Docs |
|------------|---------|------|
| **Next.js 14** | Full-stack framework | [Docs](https://nextjs.org/docs) |
| **Supabase** | Database + Auth + Storage + Realtime | [Docs](https://supabase.com/docs) |
| **Prisma** | Type-safe ORM | [Docs](https://prisma.io/docs) |
| **tRPC** | Type-safe API | [Docs](https://trpc.io/docs) |
| **Shadcn UI** | Component library | [Docs](https://ui.shadcn.com) |
| **Chart.js** | Data visualization | [Docs](https://chartjs.org/docs) |
| **AI SDK** | LLM integration | [Docs](https://sdk.vercel.ai/docs) |
| **R + admiral** | SDTM → ADaM transformation | [Pharmaverse](https://pharmaverse.org) |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────┐
│  Next.js Frontend                               │
│  - Shadcn UI components                         │
│  - Chart.js visualizations                      │
│  - AI SDK chat interface                        │
└──────────────┬──────────────────────────────────┘
               │ tRPC (type-safe)
               ↓
┌─────────────────────────────────────────────────┐
│  Next.js API Routes                             │
│  - tRPC routers                                 │
│  - Prisma ORM                                   │
│  - AI SDK (local LLM)                          │
└──────────────┬──────────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────────┐
│  Supabase                                       │
│  - PostgreSQL (pipeline metadata)               │
│  - Storage (files + datasets)                   │
│  - Auth (user management)                       │
│  - Realtime (progress streaming)                │
└──────────────┬──────────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────────┐
│  R Pipeline (stdm-to-adam/)                     │
│  - SDTM → ADaM transformation                   │
│  - admiral + pharmaverseadam                    │
└─────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- R 4.5.0+
- Supabase account
- Local LLM (optional)

### Setup Steps

1. **Set up Supabase** - Follow [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

4. **Set up Prisma**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Run development server**
   ```bash
   npm run dev
   ```

---

## 📋 Database Schema

### Core Tables

- **`pipeline_jobs`** - Track pipeline execution
  - Status tracking (pending, running, completed, failed)
  - Progress percentage
  - Error messages
  - Metadata (study info, parameters)

- **`uploaded_files`** - File metadata
  - Links to jobs
  - File type classification
  - Storage paths
  - Upload status

- **`adam_datasets`** - Generated datasets
  - Dataset name (ADSL, ADAE, etc.)
  - Record counts
  - Storage locations
  - Format (CSV, RDA, SAS)

- **`visualizations`** - Saved charts
  - Chart.js configurations
  - Links to jobs
  - User ownership

---

## 🔐 Security

### Row Level Security (RLS)

All tables have RLS policies:
- Users can only see their own data
- Authenticated access required
- Service role for backend operations

### Storage Policies

- **Private buckets**: User-specific folders
- **Public buckets**: Shareable visualizations
- Signed URLs for temporary access

---

## 📊 Data Flow

### 1. File Upload
```
User → Frontend → tRPC → Supabase Storage → Database (metadata)
```

### 2. Pipeline Execution
```
Trigger → tRPC → R Script → ADaM Datasets → Supabase Storage
                     ↓
                 Database (job status)
```

### 3. Real-time Updates
```
R Pipeline → Database → Supabase Realtime → Frontend (progress bar)
```

### 4. Visualization
```
ADaM Data → Chart.js → Canvas → Supabase Storage (image)
```

---

## 🧪 Testing

### Test Supabase Connection

```bash
npm run test:supabase
```

### Test Pipeline

```bash
cd stdm-to-adam
Rscript test_pipeline.R
```

---

## 📝 Development Guidelines

### Code Organization

```
/app                    # Next.js App Router
  /api                  # API routes
    /trpc              # tRPC endpoints
  /(auth)              # Auth pages
  /(dashboard)         # Protected pages
/components            # React components
  /ui                  # Shadcn UI components
/lib                   # Utilities
  /supabase           # Supabase client
  /prisma             # Prisma client
  /trpc               # tRPC setup
/server                # Server-side code
  /routers            # tRPC routers
/stdm-to-adam         # R pipeline
```

### Naming Conventions

- **Components**: PascalCase (e.g., `FileUpload.tsx`)
- **Functions**: camelCase (e.g., `uploadFile()`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `JOB_STATUS`)
- **Types**: PascalCase with `Type` suffix (e.g., `PipelineJobType`)

---

## 🐛 Troubleshooting

### Common Issues

1. **Supabase connection fails**
   - Check environment variables
   - Verify project URL and keys
   - Check RLS policies

2. **Prisma errors**
   - Run `npx prisma generate`
   - Check DATABASE_URL format
   - Ensure Supabase project is running

3. **R pipeline fails**
   - Verify R packages installed
   - Check file paths
   - Review error logs

---

## 🔗 Useful Links

- [Project Repository](https://github.com/ShauryaJ1/medical)
- [Supabase Dashboard](https://app.supabase.com)
- [Pharmaverse](https://pharmaverse.org)
- [CDISC Standards](https://www.cdisc.org/standards)

---

## 📞 Support

For issues or questions:
1. Check documentation
2. Review error logs
3. Search existing issues
4. Create new issue with details

---

**Last Updated**: October 2025
