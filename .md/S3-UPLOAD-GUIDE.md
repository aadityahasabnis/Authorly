# AWS S3 Image Upload Guide

## Overview

Authorly supports AWS S3 for image uploads using **presigned URLs** for secure client-side uploads.

**Requirements**:
- AWS S3 bucket
- Backend API endpoint (to generate presigned URLs)
- AWS credentials (kept secure on backend)

**Features**:
- ✅ Secure client-side uploads
- ✅ Progress tracking
- ✅ CloudFront CDN support
- ✅ Configurable API endpoint
- ✅ Responsive image attributes
- ✅ Error handling

## Quick Start

### 1. Configure S3 Bucket

**Create bucket**:
```bash
aws s3 mb s3://my-authorly-images --region us-east-1
```

**Set CORS**:
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

### 2. Create Backend API

**Example (Next.js)**:
```typescript
// app/api/s3/presigned-url/route.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: Request) {
  const { fileName, fileType, bucket, region, key } = await req.json();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: fileType,
    ACL: 'public-read',
  });

  const presignedUrl = await getSignedUrl(s3, command, {
    expiresIn: 300, // 5 minutes
  });

  const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

  return Response.json({ presignedUrl, publicUrl, key });
}
```

### 3. Configure Authorly

```typescript
import { AuthorlyEditor, createS3Config } from 'authorly-editor';

const uploadConfig = createS3Config({
  region: 'us-east-1',
  bucket: 'my-authorly-images',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  apiEndpoint: '/api/s3/presigned-url',    // Your backend endpoint
  cloudFrontDomain: 'd123.cloudfront.net', // Optional CDN
  prefix: 'blog-images',                    // Optional folder
  maxSizeMB: 10,
});

<AuthorlyEditor imageUploadConfig={uploadConfig} />
```

---

## Upload Callbacks

Monitor upload progress:

```typescript
<AuthorlyEditor
  imageUploadConfig={uploadConfig}
  onUploadStart={(fileName) => console.log('Uploading:', fileName)}
  onUploadProgress={(progress) => console.log(`${progress.percent}%`)}
  onUploadSuccess={(result) => console.log('Done:', result.url)}
  onUploadError={(error) => console.error('Failed:', error.message)}
/>
```

---

## CloudFront CDN

For faster delivery with CloudFront:

```typescript
const config = createS3Config({
  region: 'us-east-1',
  bucket: 'my-bucket',
  accessKeyId: '...',
  secretAccessKey: '...',
  cloudFrontDomain: 'd111111abcdef8.cloudfront.net', // Your CloudFront domain
});
```

Images will use CloudFront URLs instead of direct S3 URLs.

---

## Custom API Endpoint

If your backend uses a different route:

```typescript
const config = createS3Config({
  region: 'us-east-1',
  bucket: 'my-bucket',
  accessKeyId: '...',
  secretAccessKey: '...',
  apiEndpoint: '/api/upload/generate-url', // Custom endpoint
});
```

---

## Error Handling

Common errors and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| `CONFIG_ERROR` | Missing config | Check region, bucket, credentials |
| `NETWORK_ERROR` | Backend failed | Verify endpoint is running |
| `FILE_TOO_LARGE` | File > limit | Reduce size or increase limit |
| `INVALID_TYPE` | Wrong file type | Only images allowed |
| CORS error | Bucket not configured | Add CORS rules (see above) |

---

## Security Best Practices

1. **Never expose AWS credentials in frontend**
   - Use environment variables
   - Only in server-side code
   - Never commit to git

2. **Use presigned URLs** (already implemented)
   - Short expiration (5 minutes)
   - Backend controls access
   - No credentials in browser

3. **Limit bucket permissions**
   - Only allow PutObject
   - Use IAM user with minimal permissions

4. **Validate file types**
   - Already validated in Authorly
   - Add server-side validation too

5. **Add rate limiting**
   - Limit requests to your API endpoint
   - Prevent abuse

---

## Testing

```bash
# 1. Start your backend
npm run dev

# 2. Test image upload
# - Open Authorly editor
# - Insert image block (/image)
# - Upload a file
# - Check console for progress
# - Verify image in S3 bucket
```

---

## Comparison: S3 vs Cloudinary

| Feature | S3 | Cloudinary |
|---------|----|-----------
| **Setup** | Medium (needs backend) | Easy (no backend) |
| **Upload Speed** | Fast (direct) | Fast (direct) |
| **Auto Optimize** | No | Yes (q_auto, f_auto) |
| **Transforms** | No (use Lambda) | Yes (URL params) |
| **Cost** | Lower | Higher |
| **CDN** | CloudFront (extra) | Built-in |
| **Best For** | Large scale, cost control | Quick setup, transformations |

---

## Summary

✅ S3 upload fully implemented  
✅ Requires backend for presigned URLs  
✅ CloudFront CDN supported  
✅ Configurable API endpoint  
✅ Progress tracking & error handling  
✅ Responsive image attributes  

**Next Steps**:
1. Create S3 bucket with CORS
2. Create backend API endpoint
3. Configure Authorly with credentials
4. Test upload flow

For easier setup (no backend), use Cloudinary (see `UPLOAD-TESTING.md`).

