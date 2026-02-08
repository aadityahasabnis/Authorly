/**
 * Upload Type Definitions
 * Defines interfaces for image upload functionality
 */

/**
 * Result returned after successful upload
 */
export interface UploadResult {
  /** Public URL of the uploaded image */
  url: string;
  
  /** Original width of the image in pixels */
  width: number;
  
  /** Original height of the image in pixels */
  height: number;
  
  /** Image format (webp, jpg, png, etc.) */
  format: string;
  
  /** File size in bytes */
  size: number;
  
  /** Public ID (for Cloudinary) or key (for S3) */
  publicId?: string;
  
  /** Thumbnail URL (optional) */
  thumbnailUrl?: string;
}

/**
 * Upload progress information
 */
export interface UploadProgress {
  /** Upload progress percentage (0-100) */
  percent: number;
  
  /** Bytes uploaded */
  loaded: number;
  
  /** Total bytes to upload */
  total: number;
  
  /** Current upload speed in bytes/sec */
  speed?: number;
}

/**
 * Cloudinary-specific configuration
 */
export interface CloudinaryConfig {
  /** Cloudinary cloud name */
  cloudName: string;
  
  /** Upload preset (must be unsigned for client-side uploads) */
  uploadPreset: string;
  
  /** Optional API key (for signed uploads) */
  apiKey?: string;
  
  /** Optional folder path in Cloudinary */
  folder?: string;
  
  /** Optional tags to add to uploaded images */
  tags?: string[];
}

/**
 * AWS S3-specific configuration
 */
export interface S3Config {
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
  
  /** Optional ACL (default: 'public-read') */
  acl?: 'private' | 'public-read' | 'public-read-write';
  
  /** Optional custom API endpoint for presigned URL generation (default: '/api/s3/presigned-url') */
  apiEndpoint?: string;
  
  /** Optional CloudFront distribution domain for CDN URLs */
  cloudFrontDomain?: string;
}

/**
 * Custom upload function signature
 */
export type CustomUploadFunction = (
  file: File,
  onProgress?: (progress: UploadProgress) => void
) => Promise<UploadResult>;

/**
 * Upload configuration - supports multiple providers
 */
export interface UploadConfig {
  /** Upload provider type */
  provider: 'cloudinary' | 's3' | 'custom';
  
  /** Cloudinary configuration (required if provider is 'cloudinary') */
  cloudinary?: CloudinaryConfig;
  
  /** S3 configuration (required if provider is 's3') */
  s3?: S3Config;
  
  /** Custom upload function (required if provider is 'custom') */
  customUpload?: CustomUploadFunction;
  
  /** Maximum file size in bytes (default: 10MB) */
  maxSizeBytes?: number;
  
  /** Allowed file types (default: all images) */
  allowedTypes?: string[];
  
  /** Enable automatic image optimization (default: true) */
  autoOptimize?: boolean;
  
  /** Enable responsive image generation (default: true) */
  generateResponsive?: boolean;
}

/**
 * Upload error types
 */
export class UploadError extends Error {
  constructor(
    message: string,
    public code: 'FILE_TOO_LARGE' | 'INVALID_TYPE' | 'NETWORK_ERROR' | 'CONFIG_ERROR' | 'UNKNOWN'
  ) {
    super(message);
    this.name = 'UploadError';
  }
}
