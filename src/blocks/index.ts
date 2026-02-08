/**
 * Blocks Index - Export all block definitions
 */

// Block definitions
export { paragraphBlock } from './paragraph';
export {
  heading1Block,
  heading2Block,
  heading3Block,
  heading4Block,
  heading5Block,
  heading6Block,
  createHeading,
} from './heading';
export {
  bulletListBlock,
  numberedListBlock,
  checkListBlock,
  addListItem,
  removeListItem,
  toggleChecklistItem,
  indentListItem,
  outdentListItem,
} from './list';
export { quoteBlock, addCitation, removeCitation } from './quote';
export { codeBlock, setLanguage, getCode, LANGUAGES } from './code';
export {
  imageBlock,
  setImageSrc,
  setImageAlign,
  createImageFromFile,
} from './image';
export { videoBlock, setVideoSrc, getEmbedUrl } from './video';
export { dividerBlock, setDividerStyle } from './divider';
export { calloutBlock, setCalloutType, addCalloutTitle } from './callout';
export { accordionBlock, toggleAccordion, setAccordionOpen } from './accordion';
export { dateBlock, formatDate, parseDate, getToday, getTomorrow, getYesterday, setDate } from './date';
export {
  tableBlock,
  addTableRow,
  addTableColumn,
  deleteTableRow,
  deleteTableColumn,
  setCellAlignment,
  getFocusedCell,
  getCellPosition,
} from './table';
export { linkPreviewBlock } from './linkPreview';
export { excalidrawBlock } from './excalidraw';

// Import all blocks for registration
import { paragraphBlock } from './paragraph';
import {
  heading1Block,
  heading2Block,
  heading3Block,
  heading4Block,
  heading5Block,
  heading6Block,
} from './heading';
import { bulletListBlock, numberedListBlock, checkListBlock } from './list';
import { quoteBlock } from './quote';
import { codeBlock } from './code';
import { imageBlock } from './image';
import { videoBlock } from './video';
import { dividerBlock } from './divider';
import { calloutBlock } from './callout';
import { accordionBlock } from './accordion';
import { dateBlock } from './date';
import { tableBlock } from './table';
import { linkPreviewBlock } from './linkPreview';
import { excalidrawBlock } from './excalidraw';

import type { BlockDefinition } from '../core/types';

/**
 * All built-in block definitions
 */
export const allBlocks: BlockDefinition[] = [
  paragraphBlock,
  heading1Block,
  heading2Block,
  heading3Block,
  heading4Block,
  heading5Block,
  heading6Block,
  bulletListBlock,
  numberedListBlock,
  checkListBlock,
  quoteBlock,
  codeBlock,
  imageBlock,
  videoBlock,
  dividerBlock,
  calloutBlock,
  accordionBlock,
  dateBlock,
  tableBlock,
  linkPreviewBlock,
  excalidrawBlock,
];

/**
 * Default blocks for minimal editor
 */
export const defaultBlocks: BlockDefinition[] = [
  paragraphBlock,
  heading1Block,
  heading2Block,
  heading3Block,
  bulletListBlock,
  numberedListBlock,
  quoteBlock,
  codeBlock,
  imageBlock,
  dividerBlock,
];

/**
 * Block map by name
 */
export const blockMap = new Map<string, BlockDefinition>(
  allBlocks.map(block => [block.name, block])
);

/**
 * Get block definition by name
 */
export function getBlockDefinition(name: string): BlockDefinition | undefined {
  return blockMap.get(name);
}
