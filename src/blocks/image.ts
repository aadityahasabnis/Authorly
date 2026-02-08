/**
 * Image Block
 */

import type { BlockDefinition, ImageData } from '../core/types';
import { generateId } from '../utils/helpers';

/**
 * Add resize handles to a resizable wrapper element
 */
function addResizeHandles(wrapper: HTMLElement): void {
  const handles = ['se', 'sw', 'ne', 'nw', 'e', 'w'];
  handles.forEach(pos => {
    const handle = document.createElement('div');
    handle.className = `cb-image-resize-handle handle-${pos}`;
    handle.setAttribute('data-handle', pos);
    wrapper.appendChild(handle);
  });
}

export const imageBlock: BlockDefinition = {
  name: 'image',
  tag: 'figure',
  editable: false,
  allowedChildren: [],
  className: 'cb-image',
  icon: 'image',
  label: 'Image',

  create(data?: ImageData): HTMLElement {
    const figure = document.createElement('figure');
    figure.className = 'cb-image';
    figure.setAttribute('data-block-id', data?.id || generateId());
    figure.setAttribute('data-block-type', 'image');

    // Image container
    const imgContainer = document.createElement('div');
    imgContainer.className = 'cb-image-container';

    if (data?.src) {
      // Create resizable wrapper
      const resizableWrapper = document.createElement('div');
      resizableWrapper.className = 'cb-image-resizable';
      
      const img = document.createElement('img');
      img.className = 'cb-image-element';
      img.src = data.src;
      img.alt = data.alt || '';
      
      if (data.width) {
        img.style.width = typeof data.width === 'number' ? `${data.width}px` : data.width;
      }
      if (data.height) {
        img.style.height = typeof data.height === 'number' ? `${data.height}px` : data.height;
      }

      resizableWrapper.appendChild(img);
      
      // Add resize handles
      addResizeHandles(resizableWrapper);
      
      imgContainer.appendChild(resizableWrapper);
    } else {
      // Minimal professional placeholder
      const placeholder = document.createElement('div');
      placeholder.className = 'cb-image-placeholder';
      placeholder.innerHTML = `
        <div class="cb-image-placeholder-content">
          <div class="cb-image-placeholder-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="9" cy="9" r="2"/>
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
            </svg>
          </div>
          <div class="cb-image-placeholder-text">
            <span class="cb-image-placeholder-title">Click to upload or drag image</span>
            <span class="cb-image-placeholder-hint">JPG, PNG, GIF, WebP • Max 10MB</span>
          </div>
          <input type="file" accept="image/*" class="cb-image-input" />
        </div>
        <div class="cb-image-url-divider">
          <span>or</span>
        </div>
        <div class="cb-image-url-wrapper" contenteditable="false">
          <input type="url" class="cb-image-url-input" placeholder="Paste image URL and press Enter" />
        </div>
      `;
      imgContainer.appendChild(placeholder);
    }

    figure.appendChild(imgContainer);

    // Alignment controls
    if (data?.src) {
      const controls = document.createElement('div');
      controls.className = 'cb-image-controls';
      controls.innerHTML = `
        <button type="button" class="cb-image-align" data-align="left" title="Align left">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="17" x2="3" y1="10" y2="10"/><line x1="21" x2="3" y1="6" y2="6"/><line x1="21" x2="3" y1="14" y2="14"/><line x1="17" x2="3" y1="18" y2="18"/>
          </svg>
        </button>
        <button type="button" class="cb-image-align" data-align="center" title="Align center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" x2="6" y1="10" y2="10"/><line x1="21" x2="3" y1="6" y2="6"/><line x1="21" x2="3" y1="14" y2="14"/><line x1="18" x2="6" y1="18" y2="18"/>
          </svg>
        </button>
        <button type="button" class="cb-image-align" data-align="right" title="Align right">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="21" x2="7" y1="10" y2="10"/><line x1="21" x2="3" y1="6" y2="6"/><line x1="21" x2="3" y1="14" y2="14"/><line x1="21" x2="7" y1="18" y2="18"/>
          </svg>
        </button>
        <span class="cb-image-controls-divider"></span>
        <button type="button" class="cb-image-crop" data-action="crop" title="Crop image">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 2v14a2 2 0 0 0 2 2h14"/>
            <path d="M18 22V8a2 2 0 0 0-2-2H2"/>
          </svg>
        </button>
      `;
      figure.appendChild(controls);
    }

    // Caption
    const caption = document.createElement('figcaption');
    caption.className = 'cb-image-caption';
    caption.setAttribute('contenteditable', 'true');
    caption.setAttribute('data-placeholder', 'Add a caption...');
    if (data?.caption) {
      caption.textContent = data.caption;
    }
    figure.appendChild(caption);

    // Set alignment
    if (data?.align) {
      figure.setAttribute('data-align', data.align);
    }

    return figure;
  },

  getData(element: HTMLElement): ImageData {
    const img = element.querySelector('img');
    const caption = element.querySelector('figcaption');
    
    return {
      id: element.getAttribute('data-block-id') || generateId(),
      type: 'image',
      src: img?.src || '',
      alt: img?.alt || '',
      caption: caption?.textContent || undefined,
      width: img?.style.width || undefined,
      height: img?.style.height || undefined,
      align: element.getAttribute('data-align') as ImageData['align'] || undefined,
    };
  },

  update(element: HTMLElement, data: Partial<ImageData>): void {
    const img = element.querySelector('img');
    const caption = element.querySelector('figcaption');

    if (img) {
      if (data.src) img.src = data.src;
      if (data.alt !== undefined) img.alt = data.alt;
      if (data.width) img.style.width = typeof data.width === 'number' ? `${data.width}px` : data.width;
      if (data.height) img.style.height = typeof data.height === 'number' ? `${data.height}px` : data.height;
    }

    if (caption && data.caption !== undefined) {
      caption.textContent = data.caption;
    }

    if (data.align) {
      element.setAttribute('data-align', data.align);
    }
  },
};

/**
 * Set image source
 */
export function setImageSrc(figure: HTMLElement, src: string, alt = ''): void {
  let img = figure.querySelector('img');
  const container = figure.querySelector('.cb-image-container');
  
  if (!img && container) {
    // Remove placeholder
    const placeholder = container.querySelector('.cb-image-placeholder');
    if (placeholder) placeholder.remove();

    // Create resizable wrapper
    const resizableWrapper = document.createElement('div');
    resizableWrapper.className = 'cb-image-resizable';
    
    // Create image
    img = document.createElement('img');
    img.className = 'cb-image-element';
    resizableWrapper.appendChild(img);
    
    // Add resize handles
    addResizeHandles(resizableWrapper);
    
    container.appendChild(resizableWrapper);
  }

  if (img) {
    img.src = src;
    img.alt = alt;
  }
}

/**
 * Set image alignment
 */
export function setImageAlign(figure: HTMLElement, align: 'left' | 'center' | 'right'): void {
  figure.setAttribute('data-align', align);
}

/**
 * Create image from file
 */
export function createImageFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('File is not an image'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Crop image using canvas
 */
export function cropImage(
  imageSrc: string,
  cropArea: { x: number; y: number; width: number; height: number },
  originalWidth: number,
  originalHeight: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      // Calculate actual pixel coordinates from percentage-based crop area
      const scaleX = img.naturalWidth / originalWidth;
      const scaleY = img.naturalHeight / originalHeight;
      
      const sx = cropArea.x * scaleX;
      const sy = cropArea.y * scaleY;
      const sw = cropArea.width * scaleX;
      const sh = cropArea.height * scaleY;
      
      canvas.width = sw;
      canvas.height = sh;
      
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      
      resolve(canvas.toDataURL('image/png'));
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageSrc;
  });
}

/**
 * Create crop modal HTML
 */
export function createCropModal(imageSrc: string, onSave: (croppedSrc: string) => void, onCancel: () => void): HTMLElement {
  const modal = document.createElement('div');
  modal.className = 'cb-crop-modal';
  modal.innerHTML = `
    <div class="cb-crop-modal-backdrop"></div>
    <div class="cb-crop-modal-content">
      <div class="cb-crop-modal-header">
        <h3>Crop Image</h3>
        <button type="button" class="cb-crop-modal-close" title="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="cb-crop-modal-body">
        <div class="cb-crop-container">
          <div class="cb-crop-image-wrapper">
            <img src="${imageSrc}" class="cb-crop-image" alt="Crop preview" />
            <div class="cb-crop-overlay">
              <div class="cb-crop-area">
                <div class="cb-crop-handle cb-crop-handle-nw" data-handle="nw"></div>
                <div class="cb-crop-handle cb-crop-handle-ne" data-handle="ne"></div>
                <div class="cb-crop-handle cb-crop-handle-sw" data-handle="sw"></div>
                <div class="cb-crop-handle cb-crop-handle-se" data-handle="se"></div>
                <div class="cb-crop-handle cb-crop-handle-n" data-handle="n"></div>
                <div class="cb-crop-handle cb-crop-handle-e" data-handle="e"></div>
                <div class="cb-crop-handle cb-crop-handle-s" data-handle="s"></div>
                <div class="cb-crop-handle cb-crop-handle-w" data-handle="w"></div>
              </div>
            </div>
          </div>
        </div>
        <div class="cb-crop-aspect-ratios">
          <button type="button" class="cb-crop-aspect-btn active" data-aspect="free">Free</button>
          <button type="button" class="cb-crop-aspect-btn" data-aspect="1:1">1:1</button>
          <button type="button" class="cb-crop-aspect-btn" data-aspect="4:3">4:3</button>
          <button type="button" class="cb-crop-aspect-btn" data-aspect="16:9">16:9</button>
        </div>
      </div>
      <div class="cb-crop-modal-footer">
        <button type="button" class="cb-crop-cancel-btn">Cancel</button>
        <button type="button" class="cb-crop-save-btn">Apply Crop</button>
      </div>
    </div>
  `;
  
  // State
  let cropArea = { x: 50, y: 50, width: 200, height: 200 };
  let aspectRatio: number | null = null;
  let isDragging = false;
  let isResizing = false;
  let activeHandle: string | null = null;
  let startX = 0;
  let startY = 0;
  let startCrop = { ...cropArea };
  let imageWidth = 0;
  let imageHeight = 0;
  let isClosing = false; // Prevent double-close
  
  const imageWrapper = modal.querySelector('.cb-crop-image-wrapper') as HTMLElement;
  const cropImg = modal.querySelector('.cb-crop-image') as HTMLImageElement;
  const cropAreaEl = modal.querySelector('.cb-crop-area') as HTMLElement;
  
  const MIN_SIZE = 30;
  
  // Initialize crop area after image loads
  cropImg.onload = () => {
    // Get actual displayed dimensions
    imageWidth = cropImg.offsetWidth;
    imageHeight = cropImg.offsetHeight;
    
    // Set wrapper size to match image exactly
    imageWrapper.style.width = `${imageWidth}px`;
    imageWrapper.style.height = `${imageHeight}px`;
    
    // Center crop area at 80% of image
    const sizeW = imageWidth * 0.8;
    const sizeH = imageHeight * 0.8;
    cropArea = {
      x: (imageWidth - sizeW) / 2,
      y: (imageHeight - sizeH) / 2,
      width: sizeW,
      height: sizeH
    };
    updateCropAreaUI();
  };
  
  const updateCropAreaUI = () => {
    cropAreaEl.style.left = `${cropArea.x}px`;
    cropAreaEl.style.top = `${cropArea.y}px`;
    cropAreaEl.style.width = `${cropArea.width}px`;
    cropAreaEl.style.height = `${cropArea.height}px`;
  };
  
  const constrainCropArea = (area: typeof cropArea): typeof cropArea => {
    // Constrain position
    let x = Math.max(0, area.x);
    let y = Math.max(0, area.y);
    
    // Constrain size
    let width = Math.max(MIN_SIZE, area.width);
    let height = Math.max(MIN_SIZE, area.height);
    
    // Make sure it doesn't exceed image bounds
    if (x + width > imageWidth) {
      if (width > imageWidth) {
        width = imageWidth;
        x = 0;
      } else {
        x = imageWidth - width;
      }
    }
    
    if (y + height > imageHeight) {
      if (height > imageHeight) {
        height = imageHeight;
        y = 0;
      } else {
        y = imageHeight - height;
      }
    }
    
    return { x, y, width, height };
  };
  
  // Handle drag on crop area
  const handleCropMouseDown = (e: MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('cb-crop-handle')) return;
    
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startCrop = { ...cropArea };
    e.preventDefault();
  };
  
  cropAreaEl.addEventListener('mousedown', handleCropMouseDown);
  
  // Handle resize handles
  const handleHandleMouseDown = (e: MouseEvent) => {
    const handle = e.currentTarget as HTMLElement;
    isResizing = true;
    activeHandle = handle.dataset.handle || null;
    startX = e.clientX;
    startY = e.clientY;
    startCrop = { ...cropArea };
    e.preventDefault();
    e.stopPropagation();
  };
  
  modal.querySelectorAll('.cb-crop-handle').forEach(handle => {
    handle.addEventListener('mousedown', handleHandleMouseDown as EventListener);
  });
  
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging && !isResizing) return;
    
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    if (isDragging) {
      cropArea = constrainCropArea({
        x: startCrop.x + dx,
        y: startCrop.y + dy,
        width: startCrop.width,
        height: startCrop.height
      });
      updateCropAreaUI();
    } else if (isResizing && activeHandle) {
      let newX = startCrop.x;
      let newY = startCrop.y;
      let newWidth = startCrop.width;
      let newHeight = startCrop.height;
      
      // Handle different resize directions
      if (activeHandle.includes('e')) {
        newWidth = startCrop.width + dx;
      }
      if (activeHandle.includes('w')) {
        const maxDx = startCrop.width - MIN_SIZE;
        const constrainedDx = Math.min(dx, maxDx);
        newX = startCrop.x + constrainedDx;
        newWidth = startCrop.width - constrainedDx;
        // Don't let it go past left edge
        if (newX < 0) {
          newWidth = newWidth + newX;
          newX = 0;
        }
      }
      if (activeHandle.includes('s')) {
        newHeight = startCrop.height + dy;
      }
      if (activeHandle.includes('n')) {
        const maxDy = startCrop.height - MIN_SIZE;
        const constrainedDy = Math.min(dy, maxDy);
        newY = startCrop.y + constrainedDy;
        newHeight = startCrop.height - constrainedDy;
        // Don't let it go past top edge
        if (newY < 0) {
          newHeight = newHeight + newY;
          newY = 0;
        }
      }
      
      // Apply aspect ratio constraint
      if (aspectRatio !== null) {
        if (activeHandle === 'e' || activeHandle === 'w') {
          newHeight = newWidth / aspectRatio;
        } else if (activeHandle === 'n' || activeHandle === 's') {
          newWidth = newHeight * aspectRatio;
        } else {
          // Corner handles - use the larger dimension
          const ratioFromWidth = newWidth / aspectRatio;
          const ratioFromHeight = newHeight * aspectRatio;
          if (Math.abs(newWidth - ratioFromHeight) < Math.abs(newHeight - ratioFromWidth)) {
            newWidth = ratioFromHeight;
          } else {
            newHeight = ratioFromWidth;
          }
        }
      }
      
      // Constrain to bounds
      newWidth = Math.max(MIN_SIZE, Math.min(newWidth, imageWidth - newX));
      newHeight = Math.max(MIN_SIZE, Math.min(newHeight, imageHeight - newY));
      
      // Reapply aspect ratio after constraining
      if (aspectRatio !== null) {
        const currentRatio = newWidth / newHeight;
        if (currentRatio > aspectRatio) {
          newWidth = newHeight * aspectRatio;
        } else {
          newHeight = newWidth / aspectRatio;
        }
      }
      
      cropArea = { x: newX, y: newY, width: newWidth, height: newHeight };
      updateCropAreaUI();
    }
  };
  
  const handleMouseUp = () => {
    isDragging = false;
    isResizing = false;
    activeHandle = null;
  };
  
  // Handle escape key
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
      onCancel();
    }
  };
  
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
  document.addEventListener('keydown', handleKeyDown);
  
  // Cleanup function - removes all event listeners
  const cleanup = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.removeEventListener('keydown', handleKeyDown);
  };
  
  // Close and cleanup - with guard against double-close
  const closeModal = () => {
    if (isClosing) return;
    isClosing = true;
    cleanup();
    if (modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
  };
  
  // Aspect ratio buttons
  modal.querySelectorAll('.cb-crop-aspect-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      modal.querySelectorAll('.cb-crop-aspect-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const aspect = (btn as HTMLElement).dataset.aspect;
      if (aspect === 'free') {
        aspectRatio = null;
      } else if (aspect) {
        const [w, h] = aspect.split(':').map(Number);
        aspectRatio = w / h;
        
        // Apply to current crop area, centered
        const centerX = cropArea.x + cropArea.width / 2;
        const centerY = cropArea.y + cropArea.height / 2;
        
        // Calculate new dimensions that fit within current area
        let newWidth = cropArea.width;
        let newHeight = newWidth / aspectRatio;
        
        // If too tall, constrain by height
        if (newHeight > cropArea.height) {
          newHeight = cropArea.height;
          newWidth = newHeight * aspectRatio;
        }
        
        // Make sure it fits in the image
        if (newWidth > imageWidth) {
          newWidth = imageWidth;
          newHeight = newWidth / aspectRatio;
        }
        if (newHeight > imageHeight) {
          newHeight = imageHeight;
          newWidth = newHeight * aspectRatio;
        }
        
        // Center the new crop area
        let newX = centerX - newWidth / 2;
        let newY = centerY - newHeight / 2;
        
        // Constrain position
        newX = Math.max(0, Math.min(newX, imageWidth - newWidth));
        newY = Math.max(0, Math.min(newY, imageHeight - newHeight));
        
        cropArea = { x: newX, y: newY, width: newWidth, height: newHeight };
        updateCropAreaUI();
      }
    });
  });
  
  // Close button
  modal.querySelector('.cb-crop-modal-close')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeModal();
    onCancel();
  });
  
  // Backdrop click
  modal.querySelector('.cb-crop-modal-backdrop')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeModal();
    onCancel();
  });
  
  // Cancel button
  modal.querySelector('.cb-crop-cancel-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeModal();
    onCancel();
  });
  
  // Save button
  modal.querySelector('.cb-crop-save-btn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isClosing) return;
    
    try {
      const croppedSrc = await cropImage(
        cropImg.src,
        cropArea,
        imageWidth,
        imageHeight
      );
      closeModal();
      onSave(croppedSrc);
    } catch (err) {
      console.error('Failed to crop image:', err);
    }
  });
  
  // Prevent clicks inside modal content from bubbling
  modal.querySelector('.cb-crop-modal-content')?.addEventListener('click', (e) => {
    e.stopPropagation();
  });
  
  return modal;
}
