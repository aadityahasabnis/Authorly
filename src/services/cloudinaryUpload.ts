/**
 * Cloudinary Upload Service
 * Handles image uploads to Cloudinary with progress tracking
 */

import type { CloudinaryConfig, UploadResult, UploadProgress } from '../types/upload';
import { UploadError } from '../types/upload';

/**
 * Cloudinary API response interface
 */
interface CloudinaryResponse {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  url: string;
  thumbnail_url?: string;
}

/**
 * Upload image to Cloudinary
 */
export async function uploadToCloudinary(
  file: File,
  config: CloudinaryConfig,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  // Validate configuration
  if (!config.cloudName || !config.uploadPreset) {
    throw new UploadError(
      'Cloudinary configuration incomplete. Please provide cloudName and uploadPreset.',
      'CONFIG_ERROR'
    );
  }

  // Prepare form data
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', config.uploadPreset);

  // Optional: Add folder
  if (config.folder) {
    formData.append('folder', config.folder);
  }

  // Optional: Add tags
  if (config.tags && config.tags.length > 0) {
    formData.append('tags', config.tags.join(','));
  }

  // Optional: Add API key for signed uploads
  if (config.apiKey) {
    formData.append('api_key', config.apiKey);
  }

  // Cloudinary upload URL
  const uploadUrl = `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`;

  try {
    // Use XMLHttpRequest for progress tracking
    return await uploadWithProgress(uploadUrl, formData, onProgress);
  } catch (error) {
    if (error instanceof UploadError) {
      throw error;
    }
    
    // Handle network errors
    throw new UploadError(
      `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'NETWORK_ERROR'
    );
  }
}

/**
 * Upload with progress tracking using XMLHttpRequest
 */
function uploadWithProgress(
  url: string,
  formData: FormData,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
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
        try {
          const response: CloudinaryResponse = JSON.parse(xhr.responseText);
          
          const result: UploadResult = {
            url: response.secure_url,
            width: response.width,
            height: response.height,
            format: response.format,
            size: response.bytes,
            publicId: response.public_id,
            thumbnailUrl: response.thumbnail_url,
          };
          
          resolve(result);
        } catch (error) {
          reject(new UploadError(
            'Failed to parse Cloudinary response',
            'UNKNOWN'
          ));
        }
      } else {
        // Handle HTTP errors
        let errorMessage = `Upload failed with status ${xhr.status}`;
        
        try {
          const errorResponse = JSON.parse(xhr.responseText);
          if (errorResponse.error?.message) {
            errorMessage = errorResponse.error.message;
          }
        } catch {
          // Use default error message
        }
        
        reject(new UploadError(errorMessage, 'NETWORK_ERROR'));
      }
    });

    // Handle network errors
    xhr.addEventListener('error', () => {
      reject(new UploadError(
        'Network error occurred during upload',
        'NETWORK_ERROR'
      ));
    });

    // Handle aborted uploads
    xhr.addEventListener('abort', () => {
      reject(new UploadError(
        'Upload was cancelled',
        'UNKNOWN'
      ));
    });

    // Send request
    xhr.open('POST', url);
    xhr.send(formData);
  });
}

/**
 * Generate Cloudinary transformation URL
 * Adds optimization parameters to Cloudinary URLs
 */
export function optimizeCloudinaryUrl(
  url: string,
  options: {
    width?: number;
    quality?: 'auto' | number;
    format?: 'auto' | 'webp' | 'jpg' | 'png';
  } = {}
): string {
  if (!url.includes('cloudinary.com')) {
    return url;
  }

  const { width, quality = 'auto', format = 'auto' } = options;
  
  // Build transformation string
  const transformations: string[] = [];
  
  if (quality) {
    transformations.push(`q_${quality}`);
  }
  
  if (format) {
    transformations.push(`f_${format}`);
  }
  
  if (width) {
    transformations.push(`w_${width}`);
  }
  
  const transformString = transformations.join(',');
  
  // Insert transformations into URL
  return url.replace('/upload/', `/upload/${transformString}/`);
}

/**
 * Generate responsive srcset for Cloudinary images
 */
export function generateCloudinarySrcset(
  url: string,
  widths: number[] = [480, 768, 1024, 1280, 1920]
): string {
  if (!url.includes('cloudinary.com')) {
    return '';
  }

  return widths
    .map(width => {
      const resizedUrl = url.replace(
        '/upload/',
        `/upload/w_${width},q_auto,f_auto/`
      );
      return `${resizedUrl} ${width}w`;
    })
    .join(', ');
}
