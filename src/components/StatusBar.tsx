/**
 * StatusBar Component - Displays word count, reading time, and editor stats
 */

import React from 'react';
import { Clock, FileText, Type, Calendar, CheckSquare } from 'lucide-react';

export interface StatusBarProps {
  wordCount: number;
  charCount: number;
  readingTime: number; // in minutes
  lastSaved?: Date;
  selectedBlockCount?: number; // Number of selected blocks
  className?: string;
  darkMode?: boolean;
}

/**
 * Calculate reading time based on average reading speed
 * Average adult reads 200-250 words per minute
 */
export function calculateReadingTime(wordCount: number): number {
  if (wordCount === 0) return 0;
  const wordsPerMinute = 200;
  const minutes = wordCount / wordsPerMinute;
  return minutes; // Return actual decimal value
}

/**
 * Format reading time for display
 */
function formatReadingTime(minutes: number): string {
  if (minutes === 0) return '0 min read';
  if (minutes < 1) return '< 1 min read';
  
  const roundedMinutes = Math.ceil(minutes);
  
  if (roundedMinutes === 1) return '1 min read';
  if (roundedMinutes < 60) return `${roundedMinutes} min read`;
  
  const hours = Math.floor(roundedMinutes / 60);
  const remainingMinutes = roundedMinutes % 60;
  
  if (remainingMinutes === 0) {
    return hours === 1 ? '1 hour read' : `${hours} hours read`;
  }
  
  return `${hours}h ${remainingMinutes}m read`;
}

/**
 * Format last saved time
 */
function formatLastSaved(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 10) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  
  // Format as date
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  
  return date.toLocaleDateString('en-US', options);
}

export const StatusBar: React.FC<StatusBarProps> = ({
  wordCount,
  charCount,
  readingTime,
  lastSaved,
  selectedBlockCount = 0,
  className = '',
  darkMode = false,
}) => {
  return (
    <div
      className={`cb-status-bar ${className} ${darkMode ? 'cb-dark' : ''}`}
      role="status"
      aria-label="Editor statistics"
    >
      {/* Selected Blocks Count - Only show when blocks are selected */}
      {selectedBlockCount > 0 && (
        <div className="cb-status-item cb-status-highlight" title="Selected blocks">
          <CheckSquare size={14} className="cb-status-icon" />
          <span className="cb-status-label">
            {selectedBlockCount} {selectedBlockCount === 1 ? 'block' : 'blocks'} selected
          </span>
        </div>
      )}

      {/* Word Count */}
      <div className="cb-status-item" title="Word count">
        <Type size={14} className="cb-status-icon" />
        <span className="cb-status-label">
          {wordCount.toLocaleString()} {wordCount === 1 ? 'word' : 'words'}
        </span>
      </div>

      {/* Character Count */}
      <div className="cb-status-item" title="Character count">
        <FileText size={14} className="cb-status-icon" />
        <span className="cb-status-label">
          {charCount.toLocaleString()} {charCount === 1 ? 'char' : 'chars'}
        </span>
      </div>

      {/* Reading Time */}
      <div className="cb-status-item" title="Estimated reading time">
        <Clock size={14} className="cb-status-icon" />
        <span className="cb-status-label">{formatReadingTime(readingTime)}</span>
      </div>

      {/* Last Saved */}
      {lastSaved && (
        <div className="cb-status-item" title={`Saved on ${lastSaved.toLocaleString()}`}>
          <Calendar size={14} className="cb-status-icon" />
          <span className="cb-status-label">Saved {formatLastSaved(lastSaved)}</span>
        </div>
      )}
    </div>
  );
};
