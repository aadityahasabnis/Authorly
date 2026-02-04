/**
 * OpenGraph / Link Preview Utilities
 * Fetches metadata from URLs for rich link previews
 */

export interface LinkPreviewData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
  author?: string;
  publishedTime?: string;
}

/**
 * Cache for storing fetched link previews
 */
const previewCache = new Map<string, LinkPreviewData>();

/**
 * Check if URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Normalize URL (add protocol if missing)
 */
export function normalizeUrl(url: string): string {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
}

/**
 * Detect if a URL is a video embed (YouTube, Vimeo, etc.)
 */
export function isVideoUrl(url: string): boolean {
  const videoPatterns = [
    /youtube\.com\/watch/i,
    /youtu\.be\//i,
    /vimeo\.com\//i,
    /dailymotion\.com\//i,
    /twitch\.tv\//i,
  ];
  
  return videoPatterns.some(pattern => pattern.test(url));
}

/**
 * Fetch OpenGraph metadata from a URL
 * Note: In browser environment, this requires a CORS proxy or backend endpoint
 * For production, implement this on your backend
 */
export async function fetchLinkPreview(url: string): Promise<LinkPreviewData | null> {
  // Check cache first
  if (previewCache.has(url)) {
    return previewCache.get(url) || null;
  }

  try {
    // Normalize URL
    const normalizedUrl = normalizeUrl(url);
    
    if (!isValidUrl(normalizedUrl)) {
      return null;
    }

    // For client-side demo, we'll use a simplified approach
    // In production, you should use a backend endpoint or CORS proxy
    // Example: https://your-api.com/link-preview?url=${encodeURIComponent(normalizedUrl)}
    
    // For now, extract basic info from the URL
    const urlObj = new URL(normalizedUrl);
    const preview: LinkPreviewData = {
      url: normalizedUrl,
      siteName: urlObj.hostname.replace('www.', ''),
      title: urlObj.pathname.split('/').filter(Boolean).pop()?.replace(/-/g, ' ') || urlObj.hostname,
    };

    // Cache the result
    previewCache.set(url, preview);
    
    return preview;
  } catch (error) {
    console.error('Failed to fetch link preview:', error);
    return null;
  }
}

/**
 * Fetch OpenGraph metadata from backend (recommended for production)
 */
export async function fetchLinkPreviewFromBackend(
  url: string,
  apiEndpoint: string
): Promise<LinkPreviewData | null> {
  // Check cache first
  if (previewCache.has(url)) {
    return previewCache.get(url) || null;
  }

  try {
    const normalizedUrl = normalizeUrl(url);
    
    if (!isValidUrl(normalizedUrl)) {
      return null;
    }

    // Call your backend API
    const response = await fetch(`${apiEndpoint}?url=${encodeURIComponent(normalizedUrl)}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data: LinkPreviewData = await response.json();
    
    // Cache the result
    previewCache.set(url, data);
    
    return data;
  } catch (error) {
    console.error('Failed to fetch link preview from backend:', error);
    return null;
  }
}

/**
 * Extract domain from URL for display
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(normalizeUrl(url));
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url;
  }
}

/**
 * Get favicon URL for a domain
 */
export function getFaviconUrl(url: string): string {
  try {
    const urlObj = new URL(normalizeUrl(url));
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
  } catch {
    return '';
  }
}

/**
 * Clear preview cache
 */
export function clearPreviewCache(): void {
  previewCache.clear();
}

/**
 * Backend OpenGraph scraper example (Node.js/Express)
 * Place this in your backend:
 * 
 * ```typescript
 * import express from 'express';
 * import axios from 'axios';
 * import * as cheerio from 'cheerio';
 * 
 * app.get('/api/link-preview', async (req, res) => {
 *   const { url } = req.query;
 *   
 *   if (!url || typeof url !== 'string') {
 *     return res.status(400).json({ error: 'URL required' });
 *   }
 *   
 *   try {
 *     const response = await axios.get(url, {
 *       headers: {
 *         'User-Agent': 'Mozilla/5.0 (compatible; LinkPreview/1.0)',
 *       },
 *       timeout: 5000,
 *     });
 *     
 *     const $ = cheerio.load(response.data);
 *     
 *     const preview = {
 *       url,
 *       title: $('meta[property="og:title"]').attr('content') || $('title').text(),
 *       description: $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content'),
 *       image: $('meta[property="og:image"]').attr('content'),
 *       siteName: $('meta[property="og:site_name"]').attr('content'),
 *       author: $('meta[name="author"]').attr('content'),
 *       publishedTime: $('meta[property="article:published_time"]').attr('content'),
 *     };
 *     
 *     res.json(preview);
 *   } catch (error) {
 *     res.status(500).json({ error: 'Failed to fetch preview' });
 *   }
 * });
 * ```
 */
