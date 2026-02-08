/**
 * AWS S3 Upload Service
 * Handles image uploads to AWS S3 using presigned URLs
 */

import type { S3Config, UploadResult, UploadProgress } from '../types/upload';
import { UploadError } from '../types/upload';

/**
 * Upload image to S3
 * Note: This implementation requires a backend endpoint to generate presigned URLs
 * For direct client-side uploads, you'll need to provide the presigned URL
 */
export async function uploadToS3(
  file: File,
  config: S3Config,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  // Validate configuration
  if (!config.bucket || !config.region) {
    throw new UploadError(
      'S3 configuration incomplete. Please provide bucket and region.',
      'CONFIG_ERROR'
    );
  }

  try {
    // For client-side S3 uploads, you typically need a presigned URL from your backend
    // This is a placeholder implementation that shows the pattern
    
    // Step 1: Get presigned URL from your backend
    const presignedData = await getPresignedUrl(file, config);
    
    // Step 2: Upload file to S3 using presigned URL
    await uploadToPresignedUrl(presignedData.url, file, onProgress);
    
    // Step 3: Get image dimensions
    const { width, height } = await getImageDimensions(file);
    
    // Step 4: Return result
    const result: UploadResult = {
      url: presignedData.publicUrl,
      width,
      height,
      format: file.type.split('/')[1] || 'unknown',
      size: file.size,
      publicId: presignedData.key,
    };
    
    return result;
  } catch (error) {
    if (error instanceof UploadError) {
      throw error;
    }
    
    throw new UploadError(
      `S3 upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'NETWORK_ERROR'
    );
  }
}

/**
 * Get presigned URL from backend
 * Note: This requires a backend API endpoint
 */
async function getPresignedUrl(
  file: File,
  config: S3Config
): Promise<{ url: string; publicUrl: string; key: string }> {
  // This is a placeholder - developers need to implement their own backend endpoint
  // The backend should:
  // 1. Generate a unique key for the file
  // 2. Create a presigned URL for PUT operation
  // 3. Return both the presigned URL and the public URL
  
  const fileName = `${Date.now()}-${file.name}`;
  const key = config.prefix ? `${config.prefix}/${fileName}` : fileName;
  
  // Use custom API endpoint or default
  const apiEndpoint = config.apiEndpoint || '/api/s3/presigned-url';
  
  // Make backend call to generate presigned URL
  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type,
      bucket: config.bucket,
      region: config.region,
      key,
    }),
  });
  
  if (!response.ok) {
    throw new UploadError(
      `Failed to get presigned URL from server (${apiEndpoint}). ` +
      `Make sure your backend API is running and returns presigned URLs.`,
      'NETWORK_ERROR'
    );
  }
  
  const data = await response.json();
  
  // Generate public URL (use CloudFront if configured, otherwise S3 direct)
  const publicUrl = config.cloudFrontDomain
    ? generateCloudFrontUrl(config.cloudFrontDomain, data.key || key)
    : data.publicUrl || generateS3Url(config.bucket, config.region, data.key || key);
  
  return {
    url: data.presignedUrl,
    publicUrl,
    key: data.key || key,
  };
}

/**
 * Upload file to S3 using presigned URL
 */
function uploadToPresignedUrl(
  presignedUrl: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress: UploadProgress = {
            percent: Math.round((event.loaded / event.total) * 100),
            loaded: event.loaded,
            total: event.total,
          };
          onProgress(progress);
        }
      });
    }

    // Handle successful upload
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new UploadError(
          `S3 upload failed with status ${xhr.status}`,
          'NETWORK_ERROR'
        ));
      }
    });

    // Handle network errors
    xhr.addEventListener('error', () => {
      reject(new UploadError(
        'Network error occurred during S3 upload',
        'NETWORK_ERROR'
      ));
    });

    // Handle aborted uploads
    xhr.addEventListener('abort', () => {
      reject(new UploadError(
        'S3 upload was cancelled',
        'UNKNOWN'
      ));
    });

    // Send PUT request to presigned URL
    xhr.open('PUT', presignedUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}

/**
 * Get image dimensions from file
 */
function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
}

/**
 * Generate S3 public URL
 */
export function generateS3Url(
  bucket: string,
  region: string,
  key: string
): string {
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

/**
 * Generate CloudFront URL if using CDN
 */
export function generateCloudFrontUrl(
  domain: string,
  key: string
): string {
  return `https://${domain}/${key}`;
}
