/**
 * Upload Configuration Helpers
 * Convenient functions to create upload configurations
 */

import type { UploadConfig, CloudinaryConfig, S3Config, CustomUploadFunction } from '../types/upload';

/**
 * Create Cloudinary upload configuration
 * 
 * @example
 * ```typescript
 * const config = createCloudinaryConfig({
 *   cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
 *   uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET!
 * });
 * 
 * <AuthorlyEditor imageUploadConfig={config} />
 * ```
 */
export function createCloudinaryConfig(options: {
  /** Cloudinary cloud name */
  cloudName: string;
  
  /** Upload preset (must be unsigned for client uploads) */
  uploadPreset: string;
  
  /** Optional API key for signed uploads */
  apiKey?: string;
  
  /** Optional folder to organize uploads */
  folder?: string;
  
  /** Optional tags for uploaded images */
  tags?: string[];
  
  /** Maximum file size in MB (default: 10) */
  maxSizeMB?: number;
  
  /** Enable auto optimization (default: true) */
  autoOptimize?: boolean;
}): UploadConfig {
  const {
    cloudName,
    uploadPreset,
    apiKey,
    folder,
    tags,
    maxSizeMB = 10,
    autoOptimize = true,
  } = options;

  // Validate required fields
  if (!cloudName || !uploadPreset) {
    throw new Error(
      'Cloudinary configuration requires cloudName and uploadPreset.\n' +
      'Get them at: https://cloudinary.com/console/settings/upload\n' +
      'Example:\n' +
      '  cloudName: "your-cloud-name"\n' +
      '  uploadPreset: "unsigned_preset"'
    );
  }

  const cloudinaryConfig: CloudinaryConfig = {
    cloudName,
    uploadPreset,
    apiKey,
    folder,
    tags,
  };

  return {
    provider: 'cloudinary',
    cloudinary: cloudinaryConfig,
    maxSizeBytes: maxSizeMB * 1024 * 1024,
    autoOptimize,
    generateResponsive: true,
  };
}

/**
 * Create AWS S3 upload configuration
 * 
 * @example
 * ```typescript
 * const config = createS3Config({
 *   region: process.env.AWS_REGION!,
 *   bucket: process.env.AWS_BUCKET!,
 *   accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
 *   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
 *   apiEndpoint: '/api/upload/s3', // Custom endpoint
 *   cloudFrontDomain: 'd111111abcdef8.cloudfront.net' // Optional CDN
 * });
 * 
 * <AuthorlyEditor imageUploadConfig={config} />
 * ```
 */
export function createS3Config(options: {
  /** AWS region (e.g., 'us-east-1') */
  region: string;
  
  /** S3 bucket name */
  bucket: string;
  
  /** AWS access key ID */
  accessKeyId: string;
  
  /** AWS secret access key */
  secretAccessKey: string;
  
  /** Optional folder prefix */
  prefix?: string;
  
  /** Optional ACL setting */
  acl?: 'private' | 'public-read' | 'public-read-write';
  
  /** Optional custom API endpoint (default: '/api/s3/presigned-url') */
  apiEndpoint?: string;
  
  /** Optional CloudFront distribution domain */
  cloudFrontDomain?: string;
  
  /** Maximum file size in MB (default: 10) */
  maxSizeMB?: number;
}): UploadConfig {
  const {
    region,
    bucket,
    accessKeyId,
    secretAccessKey,
    prefix,
    acl = 'public-read',
    apiEndpoint,
    cloudFrontDomain,
    maxSizeMB = 10,
  } = options;

  // Validate required fields
  if (!region || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'S3 configuration requires: region, bucket, accessKeyId, secretAccessKey\n' +
      'Example:\n' +
      '  region: "us-east-1"\n' +
      '  bucket: "my-images-bucket"\n' +
      '  accessKeyId: "AKIA..."\n' +
      '  secretAccessKey: "..."\n' +
      '  apiEndpoint: "/api/s3/presigned-url" (optional)\n' +
      '  cloudFrontDomain: "d111111abcdef8.cloudfront.net" (optional)'
    );
  }

  const s3Config: S3Config = {
    region,
    bucket,
    accessKeyId,
    secretAccessKey,
    prefix,
    acl,
    apiEndpoint,
    cloudFrontDomain,
  };

  return {
    provider: 's3',
    s3: s3Config,
    maxSizeBytes: maxSizeMB * 1024 * 1024,
    autoOptimize: false, // S3 doesn't auto-optimize (but we add width/height)
    generateResponsive: true, // Now we add sizes attribute for better optimization
  };
}

/**
 * Create custom upload configuration
 * 
 * @example
 * ```typescript
 * const config = createCustomUploadConfig(async (file, onProgress) => {
 *   const formData = new FormData();
 *   formData.append('file', file);
 *   
 *   const response = await fetch('/api/upload', {
 *     method: 'POST',
 *     body: formData
 *   });
 *   
 *   const data = await response.json();
 *   
 *   return {
 *     url: data.url,
 *     width: data.width,
 *     height: data.height,
 *     format: data.format,
 *     size: file.size
 *   };
 * });
 * 
 * <AuthorlyEditor imageUploadConfig={config} />
 * ```
 */
export function createCustomUploadConfig(
  uploadFn: CustomUploadFunction,
  options?: {
    /** Maximum file size in MB (default: 10) */
    maxSizeMB?: number;
    
    /** Allowed file types */
    allowedTypes?: string[];
  }
): UploadConfig {
  const { maxSizeMB = 10, allowedTypes } = options || {};

  if (typeof uploadFn !== 'function') {
    throw new Error('Custom upload requires a function');
  }

  return {
    provider: 'custom',
    customUpload: uploadFn,
    maxSizeBytes: maxSizeMB * 1024 * 1024,
    allowedTypes,
    autoOptimize: false,
    generateResponsive: false,
  };
}

/**
 * Validate environment variables for Cloudinary
 */
export function validateCloudinaryEnv(): {
  isValid: boolean;
  cloudName?: string;
  uploadPreset?: string;
  errors: string[];
} {
  const errors: string[] = [];
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName) {
    errors.push('Missing CLOUDINARY_CLOUD_NAME environment variable');
  }

  if (!uploadPreset) {
    errors.push('Missing CLOUDINARY_UPLOAD_PRESET environment variable');
  }

  return {
    isValid: errors.length === 0,
    cloudName,
    uploadPreset,
    errors,
  };
}

/**
 * Validate environment variables for S3
 */
export function validateS3Env(): {
  isValid: boolean;
  region?: string;
  bucket?: string;
  errors: string[];
} {
  const errors: string[] = [];
  const region = process.env.AWS_REGION;
  const bucket = process.env.AWS_BUCKET;

  if (!region) {
    errors.push('Missing AWS_REGION environment variable');
  }

  if (!bucket) {
    errors.push('Missing AWS_BUCKET environment variable');
  }

  return {
    isValid: errors.length === 0,
    region,
    bucket,
    errors,
  };
}
