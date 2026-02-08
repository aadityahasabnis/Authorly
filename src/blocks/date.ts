/**
 * Date Block (Inline date display with calendar picker)
 */

import type { BlockDefinition, DateData } from '../core/types';
import { generateId } from '../utils/helpers';

/**
 * Format date to display format: Fri, 17 July 2024
 */
export function formatDate(date: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const dayName = days[date.getDay()];
  const day = date.getDate();
  const monthName = months[date.getMonth()];
  const year = date.getFullYear();
  
  return `${dayName}, ${day} ${monthName} ${year}`;
}

/**
 * Parse date string to Date object
 */
export function parseDate(dateStr: string | Date): Date {
  if (dateStr instanceof Date) return dateStr;
  return new Date(dateStr);
}

/**
 * Get today's date at midnight
 */
export function getToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * Get tomorrow's date
 */
export function getTomorrow(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}

/**
 * Get yesterday's date
 */
export function getYesterday(): Date {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  return yesterday;
}

export const dateBlock: BlockDefinition = {
  name: 'date',
  tag: 'span',
  editable: false,
  allowedChildren: [],
  className: 'cb-date',
  icon: 'calendar',
  label: 'Date',

  create(data?: DateData): HTMLElement {
    const span = document.createElement('span');
    span.className = 'cb-date-inline';
    span.setAttribute('data-block-id', data?.id || generateId());
    span.setAttribute('data-block-type', 'date');
    span.setAttribute('contenteditable', 'false');
    
    const dateValue = data?.date ? parseDate(data.date) : getToday();
    span.setAttribute('data-date', dateValue.toISOString());
    span.textContent = formatDate(dateValue);
    
    return span;
  },

  getData(element: HTMLElement): DateData {
    const dateStr = element.getAttribute('data-date') || new Date().toISOString();
    
    return {
      id: element.getAttribute('data-block-id') || generateId(),
      type: 'date',
      date: dateStr,
    };
  },

  update(element: HTMLElement, data: Partial<DateData>): void {
    if (data.date !== undefined) {
      const dateValue = parseDate(data.date);
      element.setAttribute('data-date', dateValue.toISOString());
      element.textContent = formatDate(dateValue);
    }
  },
};

/**
 * Update date value
 */
export function setDate(element: HTMLElement, date: Date): void {
  element.setAttribute('data-date', date.toISOString());
  element.textContent = formatDate(date);
}
