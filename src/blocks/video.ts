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
        
        if (data.width) {
          iframe.style.width = typeof data.width === 'number' ? `${data.width}px` : data.width;
        }
        if (data.height) {
          iframe.style.height = typeof data.height === 'number' ? `${data.height}px` : data.height;
        }

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
        if (data.width) {
          video.style.width = typeof data.width === 'number' ? `${data.width}px` : data.width;
        }
        if (data.height) {
          video.style.height = typeof data.height === 'number' ? `${data.height}px` : data.height;
        }

        container.appendChild(video);
      }
    } else {
      // Premium placeholder
      const placeholder = document.createElement('div');
      placeholder.className = 'cb-video-placeholder';
      placeholder.innerHTML = `
        <div class="cb-video-placeholder-content">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="m22 8-6 4 6 4V8Z"/>
            <rect width="14" height="12" x="2" y="6" rx="2" ry="2"/>
          </svg>
          <span>Embed a video from YouTube, Vimeo, or upload</span>
          <span class="cb-video-placeholder-hint">Paste a URL below and press Enter</span>
          <input type="text" class="cb-video-url-input" placeholder="https://youtube.com/watch?v=... or vimeo.com/..." />
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
      width: iframe?.style.width || video?.style.width || undefined,
      height: iframe?.style.height || video?.style.height || undefined,
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

  // Check if it's already an embed URL
  if (url.includes('youtube.com/embed/') || 
      url.includes('player.vimeo.com/') ||
      url.includes('dailymotion.com/embed/')) {
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
