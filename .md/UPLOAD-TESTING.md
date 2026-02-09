# Image Upload Testing Guide

Quick guide to test cloud image upload in Authorly.

---

## Option 1: Cloudinary (Recommended for Testing)

**No backend needed** - easiest setup!

### Setup

1. **Sign up**: https://cloudinary.com (free tier)
2. **Create upload preset**:
   - Go to Settings → Upload
   - Add upload preset
   - Name: `authorly-unsigned`
   - Mode: **Unsigned** (important!)
   - Save

3. **Get credentials** from dashboard:
   - Cloud name
   - Upload preset name

### Configure

```typescript
import { AuthorlyEditor, createCloudinaryConfig } from 'authorly-editor';

const uploadConfig = createCloudinaryConfig({
  cloudName: 'your-cloud-name',
  uploadPreset: 'authorly-unsigned',
  folder: 'test-images', // optional
  maxSizeMB: 10,
});

<AuthorlyEditor imageUploadConfig={uploadConfig} />
```

### Test

1. Insert image block (`/image`)
2. Upload an image
3. Watch progress bar
4. Image appears with Cloudinary URL
5. Check Cloudinary dashboard

**Features**:
- ✅ Auto-optimization (q_auto, f_auto)
- ✅ Responsive srcset (5 breakpoints)
- ✅ No backend needed
- ✅ Global CDN

---

## Option 2: AWS S3

**Requires backend** - more setup but more control.

### Setup

See [S3-UPLOAD-GUIDE.md](./S3-UPLOAD-GUIDE.md) for detailed instructions.

**Quick version**:
1. Create S3 bucket
2. Set CORS policy
3. Create backend endpoint for presigned URLs
4. Configure Authorly

```typescript
import { AuthorlyEditor, createS3Config } from 'authorly-editor';

const uploadConfig = createS3Config({
  region: 'us-east-1',
  bucket: 'my-bucket',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  apiEndpoint: '/api/s3/presigned-url',
  maxSizeMB: 10,
});

<AuthorlyEditor imageUploadConfig={uploadConfig} />
```

**Features**:
- ✅ Lower cost at scale
- ✅ Full control
- ✅ CloudFront CDN support
- ⚠️ Requires backend

---

## Option 3: Base64 Fallback

**No configuration** - for development only.

```typescript
<AuthorlyEditor 
  // No imageUploadConfig = base64 fallback
/>
```

**Features**:
- ✅ Zero setup
- ✅ Works immediately
- ⚠️ Large HTML size
- ⚠️ Not for production

Console shows: "No imageUploadConfig provided. Using base64 fallback."

---

## Testing Checklist

### Basic Upload
- [ ] Image uploads successfully
- [ ] Progress bar shows
- [ ] Image displays in editor
- [ ] No console errors

### HTML Output
- [ ] Click "Get HTML"
- [ ] Check image URL (Cloudinary/S3/base64)
- [ ] Verify responsive attributes:
  - `srcset` (Cloudinary only)
  - `sizes` attribute
  - `width` and `height`
  - `alt` text

### Error Handling
- [ ] Try file too large (>10MB)
- [ ] Try non-image file (.pdf)
- [ ] Verify error messages
- [ ] Try retry button

### Multiple Images
- [ ] Upload multiple images
- [ ] All upload correctly
- [ ] No interference

---

## Expected HTML Output

### Cloudinary:
```html
<img 
  src="https://res.cloudinary.com/.../q_auto,f_auto/.../image.jpg"
  srcset="
    https://res.cloudinary.com/.../w_480,q_auto,f_auto/.../image.jpg 480w,
    https://res.cloudinary.com/.../w_768,q_auto,f_auto/.../image.jpg 768w,
    https://res.cloudinary.com/.../w_1024,q_auto,f_auto/.../image.jpg 1024w,
    https://res.cloudinary.com/.../w_1536,q_auto,f_auto/.../image.jpg 1536w,
    https://res.cloudinary.com/.../w_2048,q_auto,f_auto/.../image.jpg 2048w
  "
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
  alt="My image description"
  width="1200"
  height="800"
/>
```

### S3:
```html
<img 
  src="https://my-bucket.s3.us-east-1.amazonaws.com/images/photo.jpg"
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
  alt="My image description"
  width="1200"
  height="800"
/>
```

### Base64:
```html
<img 
  src="data:image/jpeg;base64,/9j/4AAQSkZJRg..."
  alt="My image description"
  width="1200"
  height="800"
/>
```

---

## Troubleshooting

### Cloudinary Upload Fails

**Error**: "Upload preset not found"
- Check preset name matches exactly
- Ensure preset is **unsigned**

**Error**: "Invalid cloud name"
- Verify cloud name is correct
- Check for typos

### S3 Upload Fails

**Error**: "Failed to get presigned URL"
- Backend not running
- Wrong API endpoint
- Check backend logs

**Error**: CORS error
- Add CORS policy to S3 bucket
- Allow origin domain

### No Progress Bar

Normal for small files (<100KB). Try larger image.

---

## Verification

### In Browser DevTools

**Console**:
- Upload start log
- Progress updates
- Success with URL

**Network**:
- POST to Cloudinary/S3
- Check response status
- Verify file uploaded

### In Cloud Dashboard

**Cloudinary**:
- Media Library → Check folder
- Verify image appears

**S3**:
- S3 Console → Check bucket
- Verify object exists

---

## Next Steps

After successful testing:

1. **For Production**:
   - Use Cloudinary for auto-optimization
   - Or S3 for cost control
   - Never use base64

2. **Optimize Images**:
   - Enable responsive images
   - Add alt text
   - Use WebP format (Cloudinary auto)

3. **Monitor**:
   - Check upload errors
   - Track storage usage
   - Monitor bandwidth

---

## Quick Comparison

| Feature | Cloudinary | S3 | Base64 |
|---------|-----------|-----|--------|
| Setup | Easy | Medium | None |
| Backend | No | Yes | No |
| Auto-optimize | Yes | No | No |
| Responsive | Yes | Partial | No |
| Cost | Higher | Lower | N/A |
| Production | ✅ Yes | ✅ Yes | ❌ No |

**Recommendation**: Use Cloudinary for testing and quick projects. Use S3 for large-scale production.

---

## Support

Issues? Check:
- Environment variables correct
- API endpoints accessible
- CORS configured
- Console for errors

See [S3-UPLOAD-GUIDE.md](./S3-UPLOAD-GUIDE.md) for S3 setup details.

