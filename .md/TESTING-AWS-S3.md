# Testing AWS S3 Upload in Authorly Test Page

## Quick Setup Guide

The test page now supports **both Cloudinary and AWS S3** uploads!

---

## 🚀 Quick Start (Choose One)

### **Option 1: Test with Cloudinary** (Recommended for Quick Testing)

```bash
# 1. Copy .env.example to .env
cp .env.example .env

# 2. Edit .env and set:
VITE_UPLOAD_PROVIDER=cloudinary
VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name
VITE_CLOUDINARY_UPLOAD_PRESET=your-upload-preset

# 3. Start dev server
npm run dev

# 4. Open http://localhost:3002
```

✅ **Easier setup** - No backend needed  
✅ **Auto-optimization** - q_auto, f_auto  
✅ **Responsive images** - Auto srcset

---

### **Option 2: Test with AWS S3**

#### **Prerequisites:**
1. ✅ AWS account
2. ✅ S3 bucket created
3. ✅ **Backend API running** (generates presigned URLs)

#### **Step 1: Configure .env**

```bash
# 1. Copy .env.example to .env
cp .env.example .env

# 2. Edit .env and set:
VITE_UPLOAD_PROVIDER=s3

# AWS Credentials
VITE_AWS_REGION=us-east-1
VITE_AWS_BUCKET=my-authorly-images
VITE_AWS_ACCESS_KEY_ID=AKIA...
VITE_AWS_SECRET_ACCESS_KEY=...

# Optional
VITE_AWS_PREFIX=authorly-test
VITE_AWS_API_ENDPOINT=/api/s3/presigned-url
VITE_AWS_CLOUDFRONT_DOMAIN=d111111abcdef8.cloudfront.net
```

#### **Step 2: Start Backend API**

You need a backend to generate presigned URLs. Example:

**Using Node.js/Express:**
```bash
# Install AWS SDK
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# Create backend/server.js
```

```javascript
// backend/server.js
const express = require('express');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const app = express();
app.use(express.json());

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

app.post('/api/s3/presigned-url', async (req, res) => {
  const { fileName, fileType, bucket, region, key } = req.body;

  try {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: fileType,
      ACL: 'public-read',
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 300, // 5 minutes
    });

    const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

    res.json({ presignedUrl, publicUrl, key });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate presigned URL' });
  }
});

app.listen(3001, () => console.log('Backend running on http://localhost:3001'));
```

```bash
# Start backend
node backend/server.js
```

#### **Step 3: Start Authorly Test Page**

```bash
npm run dev
# Opens http://localhost:3002
```

---

## 🎯 What You'll See

### **Upload Service Indicator**

When you insert an image block (`/image`), you'll see:

**If Cloudinary is configured:**
```
Click to upload or drag image
JPG, PNG, GIF, WebP • Max 10MB  [☁️ Cloudinary]
```

**If S3 is configured:**
```
Click to upload or drag image
JPG, PNG, GIF, WebP • Max 10MB  [🗄️ AWS S3]
```

**If nothing is configured:**
```
Click to upload or drag image
JPG, PNG, GIF, WebP • Max 10MB  [💾 Base64 (Local)]
```

### **Status Banner**

At the top of the editor, you'll see:

**Cloudinary:**
```
✓ Cloudinary Upload Enabled
Images will upload to Cloudinary. Folder: authorly-test
```

**S3:**
```
✓ AWS S3 Upload Enabled
Images will upload to AWS S3 bucket: my-authorly-images (CloudFront CDN)
```

**Not configured:**
```
⚠ Cloud Upload Not Configured
Add credentials to .env file to enable cloud uploads. Using base64 fallback.
```

---

## 🧪 Testing Steps

### **1. Test Upload**

1. Open http://localhost:3002
2. Type `/image` and press Enter
3. Click placeholder or drag image
4. Watch upload progress
5. Verify image appears

### **2. Test HTML Output**

1. Click "View HTML" tab
2. Check image HTML:

**Cloudinary:**
```html
<figure>
  <img src="https://res.cloudinary.com/.../q_auto,f_auto/..."
       srcset="...w_480... 480w, ...w_768... 768w, ..." 
       sizes="..." />
</figure>
```

**S3:**
```html
<figure>
  <img src="https://my-bucket.s3.us-east-1.amazonaws.com/..."
       sizes="(max-width: 768px) 100vw, ..." 
       width="1920"
       height="1080" />
</figure>
```

### **3. Verify Clean Output**

✅ No `cb-*` classes  
✅ No editor UI elements  
✅ No upload spinner remnants  
✅ Only semantic HTML

---

## 🐛 Troubleshooting

### **S3 Upload Fails**

**Error:** "Failed to get presigned URL from server"

**Solutions:**
1. ✅ Check backend is running (http://localhost:3001)
2. ✅ Verify `VITE_AWS_API_ENDPOINT` matches backend route
3. ✅ Check browser console for CORS errors
4. ✅ Verify AWS credentials are correct

### **CORS Error**

**Error:** "Access to fetch blocked by CORS"

**Solution:** Add CORS to S3 bucket:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "POST", "GET"],
    "AllowedOrigins": ["http://localhost:3002"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

### **Wrong Upload Service Shows**

**Issue:** Shows "Base64 (Local)" but configured Cloudinary/S3

**Solutions:**
1. ✅ Check `.env` file has correct values
2. ✅ Restart dev server (`npm run dev`)
3. ✅ Check browser console for config errors
4. ✅ Verify `VITE_UPLOAD_PROVIDER` is set correctly

---

## 🔄 Switching Providers

### **From Cloudinary to S3:**

```bash
# Edit .env
VITE_UPLOAD_PROVIDER=s3  # Change from 'cloudinary'

# Restart dev server
npm run dev
```

### **From S3 to Cloudinary:**

```bash
# Edit .env
VITE_UPLOAD_PROVIDER=cloudinary  # Change from 's3'

# Restart dev server
npm run dev
```

---

## 📊 Comparison

| Feature | Cloudinary | S3 |
|---------|-----------|-----|
| **Setup** | ✅ Easy (no backend) | 🟡 Medium (needs backend) |
| **Backend Required** | ❌ No | ✅ Yes |
| **Optimization** | ✅ Auto (q_auto, f_auto) | ❌ Manual |
| **Responsive srcset** | ✅ Auto-generated | ❌ Manual |
| **sizes attribute** | ✅ Yes | ✅ Yes |
| **width/height** | ✅ Yes | ✅ Yes |
| **CDN** | ✅ Built-in | 🟡 CloudFront (optional) |
| **Cost** | Higher | Lower |
| **Best For** | Quick testing, auto-optimization | Production, cost control |

---

## ✅ Success Checklist

- [ ] `.env` file configured
- [ ] Dev server running (http://localhost:3002)
- [ ] Backend API running (S3 only)
- [ ] Status banner shows correct provider
- [ ] Image placeholder shows correct badge
- [ ] Upload works (spinner appears/disappears)
- [ ] Image displays after upload
- [ ] HTML output is clean (no editor classes)
- [ ] Responsive attributes present

---

## 📝 Example .env Files

### **Cloudinary Only:**
```env
VITE_UPLOAD_PROVIDER=cloudinary
VITE_CLOUDINARY_CLOUD_NAME=demo-cloud
VITE_CLOUDINARY_UPLOAD_PRESET=unsigned_preset
VITE_CLOUDINARY_FOLDER=authorly-test
VITE_MAX_UPLOAD_SIZE_MB=10
```

### **S3 Only:**
```env
VITE_UPLOAD_PROVIDER=s3
VITE_AWS_REGION=us-east-1
VITE_AWS_BUCKET=my-authorly-images
VITE_AWS_ACCESS_KEY_ID=AKIA...
VITE_AWS_SECRET_ACCESS_KEY=...
VITE_AWS_PREFIX=authorly-test
VITE_AWS_API_ENDPOINT=/api/s3/presigned-url
VITE_MAX_UPLOAD_SIZE_MB=10
```

### **S3 with CloudFront:**
```env
VITE_UPLOAD_PROVIDER=s3
VITE_AWS_REGION=us-east-1
VITE_AWS_BUCKET=my-authorly-images
VITE_AWS_ACCESS_KEY_ID=AKIA...
VITE_AWS_SECRET_ACCESS_KEY=...
VITE_AWS_CLOUDFRONT_DOMAIN=d111111abcdef8.cloudfront.net
VITE_AWS_API_ENDPOINT=/api/s3/presigned-url
VITE_MAX_UPLOAD_SIZE_MB=10
```

---

## 🎉 You're Ready!

Now you can test both Cloudinary and S3 uploads in the test page at **http://localhost:3002**.

The upload service indicator will show which provider is active, and the status banner will confirm the configuration.

Happy testing! 🚀
