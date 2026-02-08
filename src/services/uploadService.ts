/**
 * Image Upload Service
 * Main service that routes uploads to different providers
 */

import type { UploadConfig, UploadResult, UploadProgress } from '../types/upload';
import { UploadError } from '../types/upload';
import { uploadToCloudinary } from './cloudinaryUpload';
import { uploadToS3 } from './s3Upload';

/**
 * Default configuration values
 */
const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

/**
 * Image Upload Service
 * Handles file validation and routes uploads to configured provider
 */
export class ImageUploadService {
  private config: UploadConfig;

  constructor(config: UploadConfig) {
    this.config = {
      maxSizeBytes: DEFAULT_MAX_SIZE,
      allowedTypes: DEFAULT_ALLOWED_TYPES,
      autoOptimize: true,
      generateResponsive: true,
      ...config,
    };
    
    // Validate configuration on initialization
    this.validateConfig();
  }

  /**
   * Upload an image file
   */
  async upload(
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    // Validate file before upload
    this.validateFile(file);

    try {
      // Route to appropriate provider
      let result: UploadResult;

      switch (this.config.provider) {
        case 'cloudinary':
          if (!this.config.cloudinary) {
            throw new UploadError(
              'Cloudinary configuration is missing',
              'CONFIG_ERROR'
            );
          }
          result = await uploadToCloudinary(
            file,
            this.config.cloudinary,
            onProgress
          );
          break;

        case 's3':
          if (!this.config.s3) {
            throw new UploadError(
              'S3 configuration is missing',
              'CONFIG_ERROR'
            );
          }
          result = await uploadToS3(
            file,
            this.config.s3,
            onProgress
          );
          break;

        case 'custom':
          if (!this.config.customUpload) {
            throw new UploadError(
              'Custom upload function is missing',
              'CONFIG_ERROR'
            );
          }
          result = await this.config.customUpload(file, onProgress);
          break;

        default:
          throw new UploadError(
            `Unknown provider: ${this.config.provider}`,
            'CONFIG_ERROR'
          );
      }

      return result;
    } catch (error) {
      // Re-throw UploadError as-is
      if (error instanceof UploadError) {
        throw error;
      }

      // Wrap other errors
      throw new UploadError(
        `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'UNKNOWN'
      );
    }
  }

  /**
   * Validate upload configuration
   */
  private validateConfig(): void {
    if (!this.config.provider) {
      throw new UploadError(
        'Upload provider is required',
        'CONFIG_ERROR'
      );
    }

    // Provider-specific validation
    if (this.config.provider === 'cloudinary') {
      if (!this.config.cloudinary?.cloudName || !this.config.cloudinary?.uploadPreset) {
        throw new UploadError(
          'Cloudinary requires cloudName and uploadPreset. ' +
          'Get them at: https://cloudinary.com/console',
          'CONFIG_ERROR'
        );
      }
    }

    if (this.config.provider === 's3') {
      if (!this.config.s3?.bucket || !this.config.s3?.region) {
        throw new UploadError(
          'S3 requires bucket and region',
          'CONFIG_ERROR'
        );
      }
    }

    if (this.config.provider === 'custom') {
      if (!this.config.customUpload) {
        throw new UploadError(
          'Custom provider requires customUpload function',
          'CONFIG_ERROR'
        );
      }
    }
  }

  /**
   * Validate file before upload
   */
  private validateFile(file: File): void {
    // Check file size
    const maxSize = this.config.maxSizeBytes || DEFAULT_MAX_SIZE;
    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / 1024 / 1024);
      throw new UploadError(
        `File too large. Maximum size is ${maxSizeMB}MB`,
        'FILE_TOO_LARGE'
      );
    }

    // Check file type
    const allowedTypes = this.config.allowedTypes || DEFAULT_ALLOWED_TYPES;
    if (!allowedTypes.includes(file.type)) {
      const allowedExtensions = allowedTypes
        .map(type => type.split('/')[1])
        .join(', ');
      throw new UploadError(
        `Invalid file type. Allowed types: ${allowedExtensions}`,
        'INVALID_TYPE'
      );
    }

    // Check if file is actually an image
    if (!file.type.startsWith('image/')) {
      throw new UploadError(
        'Only image files are allowed',
        'INVALID_TYPE'
      );
    }
  }

  /**
   * Get human-readable error message
   */
  static getErrorMessage(error: unknown): string {
    if (error instanceof UploadError) {
      return error.message;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'An unknown error occurred during upload';
  }
}

/**
 * Helper: Check if upload config is valid
 */
export function isUploadConfigValid(config?: UploadConfig): boolean {
  if (!config) return false;

  try {
    new ImageUploadService(config);
    return true;
  } catch {
    return false;
  }
}
