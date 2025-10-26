'use client';

import { useState } from 'react';

export default function S3ModalTestPage() {
  const [file, setFile] = useState<File | null>(null);
  const [code, setCode] = useState<string>('');
  const [fileType, setFileType] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [presignedUrl, setPresignedUrl] = useState<string>('');
  const [s3Info, setS3Info] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
      
      // Auto-detect file type
      const name = selectedFile.name.toLowerCase();
      if (name.endsWith('.csv')) {
        setFileType('csv');
      } else if (name.endsWith('.xpt')) {
        setFileType('xpt');
      } else if (name.endsWith('.pdf')) {
        setFileType('pdf');
      } else if (name.endsWith('.json')) {
        setFileType('json');
      } else {
        setFileType('text');
      }
    }
  };

  const handleS3Upload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError('');
    setS3Info(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/s3-upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setS3Info(data);
        setPresignedUrl(data.presignedUrl);
        // Automatically populate code with the presigned URL
        setCode(getDefaultCodeForType(fileType, data.presignedUrl));
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) {
      setError('Please enter code to execute');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      // Simply send the code to Modal for execution
      const response = await fetch('/api/modal-execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          timeout: 300,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Processing failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getDefaultCodeForType = (type: string, presignedUrl?: string) => {
    const urlPlaceholder = presignedUrl || 'YOUR_PRESIGNED_URL_HERE';
    
    switch (type) {
      case 'csv':
        return `import requests
import pandas as pd
import io

# Download file from presigned URL
url = "${urlPlaceholder}"
response = requests.get(url)
file_content = response.content
print(f"Downloaded {len(file_content)} bytes")

# Load CSV into DataFrame
df = pd.read_csv(io.BytesIO(file_content))
print(f"Shape: {df.shape}")
print("\\nColumns:", list(df.columns))
print("\\nFirst 5 rows:")
print(df.head())
print("\\nStatistics:")
print(df.describe())

# Save summary
output_content = df.describe()`;

      case 'xpt':
        return `import requests
import pyreadstat
import io

# Download file from presigned URL
url = "${urlPlaceholder}"
response = requests.get(url)
file_content = response.content
print(f"Downloaded {len(file_content)} bytes")

# Load XPT file
df, meta = pyreadstat.read_xport(io.BytesIO(file_content))
print(f"Shape: {df.shape}")
print("\\nFirst 5 rows:")
print(df.head())

# Convert to CSV
output_content = df`;

      case 'pdf':
        return `import requests
import PyPDF2
import io

# Download file from presigned URL
url = "${urlPlaceholder}"
response = requests.get(url)
file_content = response.content
print(f"Downloaded {len(file_content)} bytes")

# Load PDF
pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
num_pages = len(pdf_reader.pages)
print(f"Pages: {num_pages}")

# Extract text
all_text = []
for i, page in enumerate(pdf_reader.pages):
    text = page.extract_text()
    all_text.append(f"Page {i+1}:\\n{text}")

output_content = "\\n".join(all_text)`;

      default:
        return `import requests

# Download file from presigned URL
url = "${urlPlaceholder}"
response = requests.get(url)
file_content = response.content
print(f"Downloaded {len(file_content)} bytes")

# Process as needed
try:
    # Try to decode as text
    text = file_content.decode('utf-8')
    print(f"Text length: {len(text)}")
    output_content = text
except:
    print("Binary file")
    output_content = str(file_content[:1000])`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
          <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">S3 + Modal File Processing Test</h1>
        <p className="text-gray-600 mb-8">
          Step 1: Upload file to S3 → Step 2: Get presigned URL → Step 3: Process with Modal
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4">1. Select File</h2>
              
              <input
                type="file"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none p-2.5"
                accept=".csv,.xpt,.pdf,.json,.txt"
              />
              
              {file && (
                <div className="mt-4 space-y-3">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm font-medium">📄 {file.name}</p>
                    <p className="text-xs text-gray-600">
                      Size: {(file.size / 1024).toFixed(2)} KB | Type: {fileType || 'auto-detect'}
                    </p>
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleS3Upload}
                    disabled={uploading || !file}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                  >
                    {uploading ? 'Uploading to S3...' : '📤 Upload to S3 & Get URL'}
                  </button>

                  {s3Info && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded">
                      <p className="text-sm font-semibold mb-2">✅ File Uploaded to S3</p>
                      <div className="space-y-1 text-xs">
                        <p><strong>S3 URI:</strong> {s3Info.s3Uri}</p>
                        <p><strong>Key:</strong> {s3Info.key}</p>
                        <details className="mt-2">
                          <summary className="cursor-pointer text-blue-600 hover:text-blue-700">Show Presigned URL</summary>
                          <div className="mt-2 p-2 bg-white rounded border border-gray-200 break-all">
                            <code className="text-xs">{s3Info.presignedUrl}</code>
                          </div>
                        </details>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4">2. Processing Code</h2>
              
              <div className="mb-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setCode(getDefaultCodeForType(fileType, presignedUrl))}
                  className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                  disabled={!presignedUrl && !file}
                  title={!presignedUrl && !file ? "Upload a file first to generate code" : ""}
                >
                  {presignedUrl ? 'Use Code with URL' : 'Use Default Code (upload file first)'}
                </button>
                <button
                  type="button"
                  onClick={() => setCode('')}
                  className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                >
                  Clear
                </button>
              </div>
              
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={`# Your Python code here
# File will be pre-loaded based on type:
#   CSV: Available as 'df' (DataFrame)
#   XPT: Available as 'df' and 'meta'
#   PDF: Available as 'pdf_reader'
#   Other: Available as 'file_content' (bytes)
# 
# To save output, assign to 'output_content'`}
                className="w-full h-64 p-3 font-mono text-sm border border-gray-300 rounded-lg"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading || !code}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Processing...' : '🚀 Execute Code in Modal'}
            </button>
            
            {!code && (
              <p className="text-xs text-gray-500 text-center mt-2">
                💡 Upload a file and get S3 URL first, then write or use default code
              </p>
            )}
          </div>

          {/* Output Section */}
          <div className="space-y-6">
            {error && (
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <h3 className="text-red-700 font-semibold mb-1">Error</h3>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {result && (
              <>
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-lg font-semibold mb-4">
                    Execution Result {result.success ? '✅' : '❌'}
                  </h2>

                  {result.success && s3Info && (
                    <div className="space-y-3 mb-4">
                      <div className="p-3 bg-green-50 border border-green-200 rounded">
                        <p className="text-sm">
                          <strong>File processed from:</strong> {s3Info.s3Uri}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm font-mono">
                      {result.output || result.error || 'No output'}
                    </pre>
                  </div>
                </div>

                {result.execution_time && (
                  <div className="bg-white p-4 rounded-lg shadow">
                    <p className="text-sm text-gray-600">
                      ⏱️ Execution time: {result.execution_time?.toFixed(2)}s
                    </p>
                  </div>
                )}
              </>
            )}

            {!result && !error && (
              <div className="bg-gray-100 p-6 rounded-lg">
                <h3 className="text-gray-700 font-semibold mb-2">How it works:</h3>
                <ol className="text-sm text-gray-600 space-y-2">
                  <li>1️⃣ Select your file (CSV, XPT, PDF, JSON, etc.)</li>
                  <li>2️⃣ Click "Upload to S3 & Get URL" to upload file</li>
                  <li>3️⃣ A presigned URL is generated automatically</li>
                  <li>4️⃣ Code is populated with the URL to download from S3</li>
                  <li>5️⃣ Click "Execute Code in Modal" to process</li>
                  <li>6️⃣ Modal downloads from S3 using the URL and runs your code</li>
                </ol>

                <div className="mt-4 p-3 bg-blue-50 rounded">
                  <p className="text-xs text-blue-700">
                    💡 <strong>Tip:</strong> After uploading, the code will automatically include your presigned URL. You can modify it as needed!
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
