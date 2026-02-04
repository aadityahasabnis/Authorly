/**
 * Metadata Panel Component - For article/post metadata
 */

import React, { useState, useCallback, useEffect } from 'react';
import { FileText, Tag, Link, Image, Calendar, X } from 'lucide-react';

export interface EditorMetadata {
  title?: string;
  description?: string;
  tags?: string[];
  canonicalUrl?: string;
  coverImage?: string;
  publishDate?: string;
  author?: string;
  slug?: string;
}

export interface MetadataPanelProps {
  metadata?: EditorMetadata;
  onChange?: (metadata: EditorMetadata) => void;
  className?: string;
}

export const MetadataPanel: React.FC<MetadataPanelProps> = ({
  metadata = {},
  onChange,
  className = '',
}) => {
  const [localMetadata, setLocalMetadata] = useState<EditorMetadata>(metadata);
  const [tagInput, setTagInput] = useState('');

  // Update local state when prop changes
  useEffect(() => {
    setLocalMetadata(metadata);
  }, [metadata]);

  const handleChange = useCallback(
    (field: keyof EditorMetadata, value: string) => {
      const updated = { ...localMetadata, [field]: value };
      setLocalMetadata(updated);
      if (onChange) {
        onChange(updated);
      }
    },
    [localMetadata, onChange]
  );

  const handleAddTag = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && tagInput.trim()) {
        e.preventDefault();
        const currentTags = localMetadata.tags || [];
        const newTag = tagInput.trim().toLowerCase();
        
        if (!currentTags.includes(newTag)) {
          const updated = {
            ...localMetadata,
            tags: [...currentTags, newTag],
          };
          setLocalMetadata(updated);
          if (onChange) {
            onChange(updated);
          }
        }
        
        setTagInput('');
      }
    },
    [localMetadata, tagInput, onChange]
  );

  const handleRemoveTag = useCallback(
    (tagToRemove: string) => {
      const updated = {
        ...localMetadata,
        tags: (localMetadata.tags || []).filter(tag => tag !== tagToRemove),
      };
      setLocalMetadata(updated);
      if (onChange) {
        onChange(updated);
      }
    },
    [localMetadata, onChange]
  );

  return (
    <div className={`cb-metadata-panel ${className}`}>
      <div className="cb-metadata-header">
        <FileText size={20} />
        <h3>Post Metadata</h3>
      </div>

      <div className="cb-metadata-content">
        {/* Title */}
        <div className="cb-metadata-field">
          <label htmlFor="meta-title" className="cb-metadata-label">
            <FileText size={16} />
            <span>Title</span>
          </label>
          <input
            id="meta-title"
            type="text"
            className="cb-metadata-input"
            placeholder="Enter post title..."
            value={localMetadata.title || ''}
            onChange={(e) => handleChange('title', e.target.value)}
          />
          <span className="cb-metadata-hint">
            {(localMetadata.title || '').length}/60 characters
          </span>
        </div>

        {/* Description */}
        <div className="cb-metadata-field">
          <label htmlFor="meta-description" className="cb-metadata-label">
            <FileText size={16} />
            <span>Description</span>
          </label>
          <textarea
            id="meta-description"
            className="cb-metadata-textarea"
            placeholder="Brief description for SEO and social media..."
            rows={3}
            value={localMetadata.description || ''}
            onChange={(e) => handleChange('description', e.target.value)}
          />
          <span className="cb-metadata-hint">
            {(localMetadata.description || '').length}/160 characters
          </span>
        </div>

        {/* Slug */}
        <div className="cb-metadata-field">
          <label htmlFor="meta-slug" className="cb-metadata-label">
            <Link size={16} />
            <span>URL Slug</span>
          </label>
          <input
            id="meta-slug"
            type="text"
            className="cb-metadata-input"
            placeholder="url-friendly-slug"
            value={localMetadata.slug || ''}
            onChange={(e) => handleChange('slug', e.target.value)}
          />
          <span className="cb-metadata-hint">
            Used in the post URL
          </span>
        </div>

        {/* Tags */}
        <div className="cb-metadata-field">
          <label htmlFor="meta-tags" className="cb-metadata-label">
            <Tag size={16} />
            <span>Tags</span>
          </label>
          
          {localMetadata.tags && localMetadata.tags.length > 0 && (
            <div className="cb-metadata-tags">
              {localMetadata.tags.map((tag) => (
                <span key={tag} className="cb-metadata-tag">
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="cb-metadata-tag-remove"
                    aria-label={`Remove ${tag}`}
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
          
          <input
            id="meta-tags"
            type="text"
            className="cb-metadata-input"
            placeholder="Type a tag and press Enter..."
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleAddTag}
          />
        </div>

        {/* Cover Image */}
        <div className="cb-metadata-field">
          <label htmlFor="meta-cover" className="cb-metadata-label">
            <Image size={16} />
            <span>Cover Image URL</span>
          </label>
          <input
            id="meta-cover"
            type="url"
            className="cb-metadata-input"
            placeholder="https://example.com/image.jpg"
            value={localMetadata.coverImage || ''}
            onChange={(e) => handleChange('coverImage', e.target.value)}
          />
          {localMetadata.coverImage && (
            <div className="cb-metadata-preview">
              <img
                src={localMetadata.coverImage}
                alt="Cover preview"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </div>

        {/* Author */}
        <div className="cb-metadata-field">
          <label htmlFor="meta-author" className="cb-metadata-label">
            <FileText size={16} />
            <span>Author</span>
          </label>
          <input
            id="meta-author"
            type="text"
            className="cb-metadata-input"
            placeholder="Author name"
            value={localMetadata.author || ''}
            onChange={(e) => handleChange('author', e.target.value)}
          />
        </div>

        {/* Publish Date */}
        <div className="cb-metadata-field">
          <label htmlFor="meta-date" className="cb-metadata-label">
            <Calendar size={16} />
            <span>Publish Date</span>
          </label>
          <input
            id="meta-date"
            type="datetime-local"
            className="cb-metadata-input"
            value={localMetadata.publishDate || ''}
            onChange={(e) => handleChange('publishDate', e.target.value)}
          />
        </div>

        {/* Canonical URL */}
        <div className="cb-metadata-field">
          <label htmlFor="meta-canonical" className="cb-metadata-label">
            <Link size={16} />
            <span>Canonical URL</span>
          </label>
          <input
            id="meta-canonical"
            type="url"
            className="cb-metadata-input"
            placeholder="https://example.com/original-post"
            value={localMetadata.canonicalUrl || ''}
            onChange={(e) => handleChange('canonicalUrl', e.target.value)}
          />
          <span className="cb-metadata-hint">
            For cross-posted or syndicated content
          </span>
        </div>
      </div>
    </div>
  );
};
