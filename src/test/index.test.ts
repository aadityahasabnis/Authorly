import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from '../paste/sanitize';

describe('sanitizeHtml', () => {
  it('should remove script tags', () => {
    const input = '<p>Hello</p><script>alert("xss")</script>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<script>');
    expect(result).toContain('Hello');
  });

  it('should preserve allowed tags', () => {
    const input = '<p><strong>Bold</strong> and <em>italic</em></p>';
    const result = sanitizeHtml(input);
    expect(result).toContain('<strong>');
    expect(result).toContain('<em>');
  });

  it('should remove onclick attributes', () => {
    const input = '<p onclick="alert()">Click me</p>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('onclick');
    expect(result).toContain('Click me');
  });

  it('should handle nested HTML structures', () => {
    const input = '<div><p>Nested <strong>content</strong></p></div>';
    const result = sanitizeHtml(input);
    expect(result).toContain('Nested');
    expect(result).toContain('<strong>content</strong>');
  });

  it('should handle empty input', () => {
    const result = sanitizeHtml('');
    expect(result).toBe('');
  });
});

describe('exports', () => {
  it('should export ContentBlocksEditor', async () => {
    const exports = await import('../index');
    expect(exports.ContentBlocksEditor).toBeDefined();
  });

  it('should export ContentBlocksRenderer', async () => {
    const exports = await import('../index');
    expect(exports.ContentBlocksRenderer).toBeDefined();
  });

  it('should export TableOfContents', async () => {
    const exports = await import('../index');
    expect(exports.TableOfContents).toBeDefined();
  });

  it('should export blockRegistry', async () => {
    const exports = await import('../index');
    expect(exports.blockRegistry).toBeDefined();
  });

  it('should export sanitizeHtml', async () => {
    const exports = await import('../index');
    expect(exports.sanitizeHtml).toBeDefined();
  });
});
