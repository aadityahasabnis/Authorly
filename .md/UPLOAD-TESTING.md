# Image Upload Testing Guide

This guide will help you test the cloud image upload feature in the Authorly editor.

## Prerequisites

1. **Cloudinary Account** (Free tier available)
   - Sign up at https://cloudinary.com
   - Get your credentials from the dashboard

## Setup Steps

### 1. Configure Cloudinary

1. Log in to your Cloudinary account
2. Go to **Settings** → **Upload**
3. Scroll to **Upload presets**
4. Click **Add upload preset**
5. Configure:
   - **Preset name**: `authorly-unsigned`
   - **Signing mode**: **Unsigned** (important!)
   - **Folder**: Leave blank or set a default folder
   - **Access mode**: Public (default)
6. Save the preset

### 2. Add Credentials to .env

1. Open `.env` in the `authorly` folder
2. Add your credentials:

```env
VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name-here
VITE_CLOUDINARY_UPLOAD_PRESET=authorly-unsigned
VITE_CLOUDINARY_FOLDER=authorly-test
VITE_MAX_UPLOAD_SIZE_MB=10
```

Replace `your-cloud-name-here` with your actual Cloudinary cloud name (found in dashboard).

### 3. Start the Dev Server

```bash
cd authorly
npm run dev
```

The test page will open at `http://localhost:5173`

## Testing the Upload Feature

### Test 1: Basic Image Upload

1. Open the test page
2. Look for the upload status indicator:
   - **Green** = Cloud upload enabled
   - **Yellow** = Not configured (using base64 fallback)
3. In the editor, type `/image` and press Enter
4. Click the image placeholder or drag & drop an image
5. Watch the upload progress bar
6. Verify the image appears in the editor

### Test 2: Drag & Drop

1. Drag an image file from your file explorer
2. Drop it directly into the editor
3. Verify upload progress is shown
4. Check that the image is inserted

### Test 3: Large Files

1. Try uploading a large image (close to 10MB)
2. Verify progress bar updates smoothly
3. Check upload completes successfully

### Test 4: Error Handling

1. Try uploading a non-image file (e.g., .pdf)
2. Verify error message is displayed
3. Try uploading with incorrect credentials in .env
4. Verify appropriate error handling

### Test 5: Multiple Images

1. Upload multiple images in sequence
2. Verify each upload completes before starting next
3. Check all images are displayed correctly

## Verifying Uploads

### In Cloudinary Dashboard

1. Go to **Media Library**
2. Navigate to your folder (`authorly-test`)
3. Verify uploaded images appear
4. Check image metadata

### In Browser DevTools

1. Open DevTools (F12)
2. Go to **Console** tab
3. Look for upload logs:
   - Upload start
   - Progress updates
   - Success with URL
4. Go to **Network** tab
5. Filter by "upload"
6. Verify POST requests to Cloudinary API

## Expected Behavior

### When Configured ✅
- Green "Cloud Upload Enabled" banner
- Images upload to Cloudinary
- Progress bar shows during upload
- Success message with URL appears
- Images load from Cloudinary CDN

### When Not Configured ⚠️
- Yellow "Cloud Upload Not Configured" banner
- Images converted to base64
- No upload progress (instant)
- No network requests
- Images embedded in HTML

## Troubleshooting

### Upload Fails with "Upload preset not found"
- Check your preset name in .env matches exactly
- Ensure preset is **unsigned** in Cloudinary settings

### Upload Fails with "Invalid cloud name"
- Verify `VITE_CLOUDINARY_CLOUD_NAME` is correct
- Check for typos or extra spaces

### Progress Bar Doesn't Update
- This is normal for small files (< 100KB)
- Try larger images to see progress

### Images Don't Appear
- Check browser console for errors
- Verify Cloudinary CORS settings allow your domain
- Check upload preset allows public access

## Advanced Testing

### Test Different Image Formats
- JPEG
- PNG
- WebP
- GIF
- SVG (should fail - not allowed by default)

### Test Responsive Images
- Upload image and inspect HTML
- Look for Cloudinary transformation URLs
- Verify different sizes are generated

### Test Image Optimization
- Compare original vs uploaded file size
- Check Cloudinary dashboard for auto-optimizations
- Verify format conversion (e.g., PNG → WebP)

## Success Criteria

✅ All tests pass
✅ Images upload to Cloudinary
✅ Progress indicator works smoothly
✅ Error handling is clear
✅ Images display correctly
✅ No console errors
✅ Fallback to base64 works when not configured

## Next Steps

Once testing is complete and successful:
1. Document any issues found
2. Ready for production use
3. Publish to npm as `authorly-editor@0.1.9`

## Support

If you encounter issues:
- Check `.env` values are correct
- Verify Cloudinary preset is **unsigned**
- Look at browser console for detailed errors
- Check Network tab for failed requests
