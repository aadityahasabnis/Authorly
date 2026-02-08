# AWS S3 Image Upload Guide

## Overview

Authorly supports AWS S3 for image uploads. The S3 implementation uses **presigned URLs** for secure client-side uploads, which requires a backend API endpoint to generate the presigned URLs.

---

## ✅ S3 Upload Implementation Status

**Current Status:** ✅ **FULLY IMPLEMENTED**

All S3 upload functionality is complete and ready to use:

- ✅ S3 upload service with progress tracking (`src/services/s3Upload.ts`)
- ✅ Helper functions for config creation (`src/utils/uploadConfigHelpers.ts`)
- ✅ Integration with main upload service (`src/services/uploadService.ts`)
- ✅ TypeScript types and interfaces (`src/types/upload.ts`)
- ✅ Exported from main package (`src/index.ts`)
- ✅ File validation (size, type)
- ✅ Progress callbacks
- ✅ Error handling
- ✅ Image dimension extraction
- ✅ Public URL generation
- ✅ CloudFront CDN support

**What You Need to Add:**
- Backend API endpoint to generate presigned URLs (see below)

---

## Architecture

```
┌─────────────┐       ┌─────────────────┐       ┌─────────────┐
│   Browser   │──────▶│  Your Backend   │──────▶│   AWS S3    │
│  (Authorly) │       │   /api/s3/...   │       │   Bucket    │
└─────────────┘       └─────────────────┘       └─────────────┘
      │                       │                         │
      │  1. Request           │                         │
      │     presigned URL     │                         │
      │──────────────────────▶│                         │
      │                       │  2. Generate            │
      │                       │     presigned URL       │
      │                       │────────────────────────▶│
      │                       │                         │
      │  3. Presigned URL     │                         │
      │◀──────────────────────│                         │
      │                       │                         │
      │  4. PUT file directly │                         │
      │─────────────────────────────────────────────────▶│
      │                       │                         │
      │  5. Upload complete   │                         │
      │◀─────────────────────────────────────────────────│
```

**Why Presigned URLs?**
- ✅ Secure: No AWS credentials exposed to client
- ✅ Direct upload: File goes straight to S3 (fast)
- ✅ Access control: Your backend controls who can upload
- ✅ Customization: Backend can set file naming, permissions, etc.

---

## Setup Instructions

### 1. Create S3 Bucket

```bash
# Using AWS CLI
aws s3 mb s3://my-authorly-images --region us-east-1

# Or use AWS Console: https://s3.console.aws.amazon.com
```

**Bucket Settings:**
- **Public Access:** Enable if you want public image URLs
- **CORS:** Configure to allow uploads (see below)

**CORS Configuration:**
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "POST", "GET"],
    "AllowedOrigins": ["http://localhost:3000", "https://yourdomain.com"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

---

### 2. Create IAM User for Uploads

```bash
# Create IAM user
aws iam create-user --user-name authorly-uploader

# Create access key
aws iam create-access-key --user-name authorly-uploader
```

**IAM Policy (minimum permissions):**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl"
      ],
      "Resource": "arn:aws:s3:::my-authorly-images/*"
    }
  ]
}
```

---

### 3. Backend API Implementation

You need to create a backend endpoint that generates presigned URLs. Here are examples for different frameworks:

#### **Node.js / Express**

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

```typescript
// api/s3/presigned-url.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { fileName, fileType, bucket, region, key } = req.body;

  try {
    // Create PUT command
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: fileType,
      ACL: 'public-read', // Or 'private' if using CloudFront
    });

    // Generate presigned URL (expires in 5 minutes)
    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 300,
    });

    // Generate public URL
    const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

    res.status(200).json({
      presignedUrl,
      publicUrl,
      key,
    });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    res.status(500).json({ error: 'Failed to generate presigned URL' });
  }
}
```

#### **Next.js App Router**

```typescript
// app/api/s3/presigned-url/route.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { NextRequest, NextResponse } from 'next/server';

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: NextRequest) {
  try {
    const { fileName, fileType, bucket, region, key } = await req.json();

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: fileType,
      ACL: 'public-read',
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 300,
    });

    const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

    return NextResponse.json({
      presignedUrl,
      publicUrl,
      key,
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate presigned URL' },
      { status: 500 }
    );
  }
}
```

---

### 4. Configure Authorly Editor

#### **Option A: Environment Variables**

```bash
# .env.local
AWS_REGION=us-east-1
AWS_BUCKET=my-authorly-images
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
```

```typescript
import { ContentBlocksEditor, createS3Config } from 'authorly-editor';

const uploadConfig = createS3Config({
  region: process.env.AWS_REGION!,
  bucket: process.env.AWS_BUCKET!,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  prefix: 'blog-images', // Optional: folder in bucket
  maxSizeMB: 10, // Optional: default is 10MB
});

<ContentBlocksEditor imageUploadConfig={uploadConfig} />
```

#### **Option B: Manual Configuration**

```typescript
import { ContentBlocksEditor } from 'authorly-editor';
import type { UploadConfig } from 'authorly-editor';

const uploadConfig: UploadConfig = {
  provider: 's3',
  s3: {
    region: 'us-east-1',
    bucket: 'my-authorly-images',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    prefix: 'blog-images', // Optional
    acl: 'public-read', // Optional
  },
  maxSizeBytes: 10 * 1024 * 1024, // 10MB
};

<ContentBlocksEditor imageUploadConfig={uploadConfig} />
```

---

## Using CloudFront CDN

If you're using CloudFront for faster delivery:

```typescript
// Modify your backend to return CloudFront URL
const publicUrl = `https://d111111abcdef8.cloudfront.net/${key}`;

// Or use the helper function
import { generateCloudFrontUrl } from 'authorly-editor';

const url = generateCloudFrontUrl('d111111abcdef8.cloudfront.net', key);
```

---

## Upload Callbacks

Monitor upload progress:

```typescript
<ContentBlocksEditor
  imageUploadConfig={uploadConfig}
  onUploadStart={(fileName) => {
    console.log('Upload started:', fileName);
  }}
  onUploadProgress={(progress) => {
    console.log(`Upload: ${progress.percent}%`);
  }}
  onUploadSuccess={(result) => {
    console.log('Upload complete:', result.url);
  }}
  onUploadError={(error) => {
    console.error('Upload failed:', error.message);
  }}
/>
```

---

## Error Handling

Common errors and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| `CONFIG_ERROR` | Missing S3 config | Verify `region`, `bucket`, `accessKeyId`, `secretAccessKey` |
| `NETWORK_ERROR` | Backend API failed | Check backend logs, verify endpoint URL |
| `FILE_TOO_LARGE` | File exceeds limit | Reduce file size or increase `maxSizeMB` |
| `INVALID_TYPE` | Wrong file type | Only images allowed (jpg, png, gif, webp, svg) |
| CORS error | Bucket CORS not configured | Add CORS rules to S3 bucket (see above) |

---

## Testing S3 Upload

```bash
# 1. Start your backend
npm run dev

# 2. Start Authorly test page
cd authorly
npm run dev

# 3. Open http://localhost:3002
# 4. Insert image block (/image)
# 5. Upload an image
# 6. Check browser console for progress
# 7. Verify image appears in S3 bucket
```

---

## Security Best Practices

1. **Never expose AWS credentials in frontend code**
   - ✅ Use environment variables
   - ✅ Only in server-side code
   - ❌ Never commit to git

2. **Use presigned URLs** (already implemented)
   - ✅ Short expiration (5 minutes)
   - ✅ Backend controls access
   - ✅ No credentials in browser

3. **Limit bucket permissions**
   - ✅ Only allow PutObject
   - ✅ Use IAM user with minimal permissions
   - ✅ Consider bucket policies

4. **Validate file types**
   - ✅ Already validated in Authorly
   - ✅ Add server-side validation too

5. **Rate limiting**
   - ⚠️ Add rate limiting to your API endpoint
   - ⚠️ Prevent abuse

---

## API Reference

### `createS3Config(options)`

Creates S3 upload configuration.

**Parameters:**
- `region` (string) - AWS region (e.g., 'us-east-1')
- `bucket` (string) - S3 bucket name
- `accessKeyId` (string) - AWS access key
- `secretAccessKey` (string) - AWS secret key
- `prefix?` (string) - Optional folder prefix
- `acl?` (string) - Optional ACL ('private' | 'public-read' | 'public-read-write')
- `maxSizeMB?` (number) - Max file size in MB (default: 10)

**Returns:** `UploadConfig`

---

### `uploadToS3(file, config, onProgress?)`

Uploads file to S3 (used internally by Authorly).

**Parameters:**
- `file` (File) - File to upload
- `config` (S3Config) - S3 configuration
- `onProgress?` (callback) - Optional progress callback

**Returns:** `Promise<UploadResult>`

---

### `generateS3Url(bucket, region, key)`

Generates S3 public URL.

**Parameters:**
- `bucket` (string) - S3 bucket name
- `region` (string) - AWS region
- `key` (string) - S3 object key

**Returns:** `string` - Public URL

**Example:**
```typescript
const url = generateS3Url('my-bucket', 'us-east-1', 'images/photo.jpg');
// https://my-bucket.s3.us-east-1.amazonaws.com/images/photo.jpg
```

---

### `generateCloudFrontUrl(domain, key)`

Generates CloudFront CDN URL.

**Parameters:**
- `domain` (string) - CloudFront distribution domain
- `key` (string) - S3 object key

**Returns:** `string` - CloudFront URL

**Example:**
```typescript
const url = generateCloudFrontUrl('d111111abcdef8.cloudfront.net', 'images/photo.jpg');
// https://d111111abcdef8.cloudfront.net/images/photo.jpg
```

---

## Comparison: S3 vs Cloudinary

| Feature | S3 | Cloudinary |
|---------|----|-----------
| **Setup Complexity** | 🟡 Medium (requires backend) | 🟢 Easy (client-side) |
| **Upload Speed** | 🟢 Direct to S3 (fast) | 🟢 Direct upload (fast) |
| **Auto Optimization** | ❌ No | ✅ Yes (q_auto, f_auto) |
| **Responsive Images** | ❌ Manual | ✅ Auto (srcset) |
| **Image Transforms** | ❌ No (use Lambda@Edge) | ✅ Yes (URL params) |
| **Cost** | 🟢 Lower (storage) | 🟡 Higher (but includes features) |
| **CDN** | 🟡 CloudFront (extra setup) | ✅ Built-in global CDN |
| **Best For** | Large scale, custom needs | Quick setup, transformations |

**Recommendation:**
- **Use Cloudinary**: Quick projects, need transformations, want auto-optimization
- **Use S3**: Large scale, have backend, need cost control, custom workflows

---

## Complete Example

```typescript
// components/Editor.tsx
import { ContentBlocksEditor, createS3Config } from 'authorly-editor';
import { useState } from 'react';
import type { EditorRef } from 'authorly-editor';

export default function Editor() {
  const editorRef = useRef<EditorRef>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');

  // Create S3 config
  const uploadConfig = createS3Config({
    region: process.env.NEXT_PUBLIC_AWS_REGION!,
    bucket: process.env.NEXT_PUBLIC_AWS_BUCKET!,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    prefix: 'blog-images',
    maxSizeMB: 5,
  });

  return (
    <div>
      {uploadStatus && (
        <div className="upload-status">{uploadStatus}</div>
      )}
      
      <ContentBlocksEditor
        ref={editorRef}
        imageUploadConfig={uploadConfig}
        onUploadStart={(fileName) => {
          setUploadStatus(`Uploading ${fileName}...`);
        }}
        onUploadProgress={(progress) => {
          setUploadStatus(`Uploading... ${progress.percent}%`);
        }}
        onUploadSuccess={(result) => {
          setUploadStatus(`Upload complete: ${result.url}`);
          setTimeout(() => setUploadStatus(''), 3000);
        }}
        onUploadError={(error) => {
          setUploadStatus(`Upload failed: ${error.message}`);
        }}
      />
    </div>
  );
}
```

---

## Summary

✅ **S3 upload is fully implemented and ready to use**
✅ **All features working: progress tracking, error handling, validation**
✅ **Requires backend API for presigned URLs (examples provided)**
✅ **Helper functions available for easy setup**
✅ **Exported and documented**

**Next Steps:**
1. Create backend API endpoint (see examples above)
2. Configure S3 bucket with CORS
3. Set up environment variables
4. Test upload flow
5. Deploy!

For Cloudinary (easier setup), see `UPLOAD-TESTING.md`.
