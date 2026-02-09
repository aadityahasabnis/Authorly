/**
 * Video Block
 */

import type { BlockDefinition, VideoData } from '../core/types';
import { generateId } from '../utils/helpers';

// Common video platforms
const VIDEO_PATTERNS = {
  youtube: /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  vimeo: /vimeo\.com\/(?:video\/)?(\d+)/,
  dailymotion: /dailymotion\.com\/(?:video|embed\/video)\/([a-zA-Z0-9]+)/,
};

export const videoBlock: BlockDefinition = {
  name: 'video',
  tag: 'figure',
  editable: false,
  allowedChildren: [],
  className: 'cb-video',
  icon: 'video',
  label: 'Video',

  create(data?: VideoData): HTMLElement {
    const figure = document.createElement('figure');
    figure.className = 'cb-video';
    figure.setAttribute('data-block-id', data?.id || generateId());
    figure.setAttribute('data-block-type', 'video');

    const container = document.createElement('div');
    container.className = 'cb-video-container';

    if (data?.src) {
      const embedUrl = getEmbedUrl(data.src);
      
      if (embedUrl) {
        // External embed (YouTube, Vimeo, etc.)
        const iframe = document.createElement('iframe');
        iframe.className = 'cb-video-iframe';
        iframe.src = embedUrl;
        iframe.setAttribute('frameborder', '0');
        iframe.setAttribute('allowfullscreen', 'true');
        iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');

        container.appendChild(iframe);
      } else {
        // Direct video file
        const video = document.createElement('video');
        video.className = 'cb-video-element';
        video.src = data.src;
        video.controls = true;
        
        if (data.poster) {
          video.poster = data.poster;
        }

        container.appendChild(video);
      }
    } else {
      // Minimal professional placeholder
      const placeholder = document.createElement('div');
      placeholder.className = 'cb-video-placeholder';
      placeholder.innerHTML = `
        <div class="cb-video-placeholder-content">
          <div class="cb-video-placeholder-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m22 8-6 4 6 4V8Z"/>
              <rect width="14" height="12" x="2" y="6" rx="2" ry="2"/>
            </svg>
          </div>
          <div class="cb-video-placeholder-text">
            <span class="cb-video-placeholder-title">Embed video from YouTube or Vimeo</span>
            <span class="cb-video-placeholder-hint">Paste URL below and press Enter</span>
          </div>
        </div>
        <div class="cb-video-url-wrapper" contenteditable="false">
          <input type="url" class="cb-video-url-input" placeholder="https://youtube.com/watch?v=... or vimeo.com/..." />
        </div>
      `;
      container.appendChild(placeholder);
    }

    figure.appendChild(container);

    // Caption
    const caption = document.createElement('figcaption');
    caption.className = 'cb-video-caption';
    caption.setAttribute('contenteditable', 'true');
    caption.setAttribute('data-placeholder', 'Add a caption...');
    if (data?.caption) {
      caption.textContent = data.caption;
    }
    figure.appendChild(caption);

    return figure;
  },

  getData(element: HTMLElement): VideoData {
    const iframe = element.querySelector('iframe');
    const video = element.querySelector('video');
    const caption = element.querySelector('figcaption');
    
    return {
      id: element.getAttribute('data-block-id') || generateId(),
      type: 'video',
      src: iframe?.src || video?.src || '',
      poster: video?.poster || undefined,
      caption: caption?.textContent || undefined,
    };
  },

  update(element: HTMLElement, data: Partial<VideoData>): void {
    if (data.src) {
      const container = element.querySelector('.cb-video-container');
      if (container) {
        container.innerHTML = '';
        
        const embedUrl = getEmbedUrl(data.src);
        
        if (embedUrl) {
          const iframe = document.createElement('iframe');
          iframe.className = 'cb-video-iframe';
          iframe.src = embedUrl;
          iframe.setAttribute('frameborder', '0');
          iframe.setAttribute('allowfullscreen', 'true');
          container.appendChild(iframe);
        } else {
          const video = document.createElement('video');
          video.className = 'cb-video-element';
          video.src = data.src;
          video.controls = true;
          if (data.poster) video.poster = data.poster;
          container.appendChild(video);
        }
      }
    }

    if (data.caption !== undefined) {
      const caption = element.querySelector('figcaption');
      if (caption) caption.textContent = data.caption;
    }
  },
};

/**
 * Get embed URL for common video platforms
 */
export function getEmbedUrl(url: string): string | null {
  // PROFESSIONAL FIX: Validate URL is safe before processing
  // Prevent XSS attacks via javascript: or data: URLs
  try {
    const urlObj = new URL(url);
    // Only allow http: and https: protocols
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      console.warn('Invalid video URL protocol:', urlObj.protocol);
      return null;
    }
  } catch (_e) {
    // Invalid URL format
    console.warn('Invalid video URL format:', url);
    return null;
  }

  // YouTube
  const ytMatch = url.match(VIDEO_PATTERNS.youtube);
  if (ytMatch) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`;
  }

  // Vimeo
  const vimeoMatch = url.match(VIDEO_PATTERNS.vimeo);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  // Dailymotion
  const dmMatch = url.match(VIDEO_PATTERNS.dailymotion);
  if (dmMatch) {
    return `https://www.dailymotion.com/embed/video/${dmMatch[1]}`;
  }

  // PROFESSIONAL FIX: Strict validation for embed URLs
  // Only accept URLs from trusted domains with proper structure
  if (url.startsWith('https://www.youtube.com/embed/') || 
      url.startsWith('https://player.vimeo.com/video/') ||
      url.startsWith('https://www.dailymotion.com/embed/video/')) {
    return url;
  }

  return null;
}

/**
 * Set video source
 */
export function setVideoSrc(figure: HTMLElement, src: string): void {
  const container = figure.querySelector('.cb-video-container');
  if (!container) return;

  // Clear existing content
  container.innerHTML = '';

  const embedUrl = getEmbedUrl(src);
  
  if (embedUrl) {
    const iframe = document.createElement('iframe');
    iframe.className = 'cb-video-iframe';
    iframe.src = embedUrl;
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allowfullscreen', 'true');
    iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
    container.appendChild(iframe);
  } else if (src) {
    const video = document.createElement('video');
    video.className = 'cb-video-element';
    video.src = src;
    video.controls = true;
    container.appendChild(video);
  }
}

