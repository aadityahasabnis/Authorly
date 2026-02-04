/**
 * Block Registry - Manages all block definitions
 */

import type { BlockDefinition, BlockType, BlockData } from './types';
import { generateId } from '../utils/helpers';

class BlockRegistry {
  private blocks: Map<BlockType, BlockDefinition> = new Map();
  private defaultBlock: BlockType = 'paragraph';

  /**
   * Register a block definition
   */
  register(definition: BlockDefinition): void {
    this.blocks.set(definition.name, definition);
  }

  /**
   * Unregister a block
   */
  unregister(name: BlockType): void {
    this.blocks.delete(name);
  }

  /**
   * Get a block definition
   */
  get(name: BlockType): BlockDefinition | undefined {
    return this.blocks.get(name);
  }

  /**
   * Check if a block is registered
   */
  has(name: BlockType): boolean {
    return this.blocks.has(name);
  }

  /**
   * Get all registered blocks
   */
  getAll(): BlockDefinition[] {
    return Array.from(this.blocks.values());
  }

  /**
   * Get all block names
   */
  getNames(): BlockType[] {
    return Array.from(this.blocks.keys());
  }

  /**
   * Set the default block type
   */
  setDefaultBlock(name: BlockType): void {
    if (this.has(name)) {
      this.defaultBlock = name;
    }
  }

  /**
   * Get the default block type
   */
  getDefaultBlock(): BlockType {
    return this.defaultBlock;
  }

  /**
   * Create a block element
   */
  createBlock(type: BlockType, data?: Partial<BlockData>): HTMLElement | null {
    const definition = this.get(type);
    if (!definition) {
      console.warn(`Block type "${type}" is not registered`);
      return null;
    }

    const blockData = {
      id: generateId(),
      type,
      ...data,
    } as BlockData;

    const element = definition.create(blockData);
    element.setAttribute('data-block-id', blockData.id);
    element.setAttribute('data-block-type', type);

    return element;
  }

  /**
   * Get block type from element
   */
  getBlockType(element: HTMLElement): BlockType | null {
    return element.getAttribute('data-block-type') as BlockType | null;
  }

  /**
   * Get block data from element
   */
  getBlockData(element: HTMLElement): BlockData | null {
    const type = this.getBlockType(element);
    if (!type) return null;

    const definition = this.get(type);
    if (!definition) return null;

    return definition.getData(element);
  }

  /**
   * Update a block element
   */
  updateBlock(element: HTMLElement, data: Partial<BlockData>): void {
    const type = this.getBlockType(element);
    if (!type) return;

    const definition = this.get(type);
    if (!definition) return;

    definition.update(element, data);
  }

  /**
   * Transform a block to a different type
   */
  transformBlock(element: HTMLElement, newType: BlockType): HTMLElement | null {
    const currentType = this.getBlockType(element);
    if (!currentType || currentType === newType) return element;

    const currentDefinition = this.get(currentType);
    const newDefinition = this.get(newType);
    
    if (!currentDefinition || !newDefinition) return null;

    // Get content from current block
    const content = element.innerHTML;
    const id = element.getAttribute('data-block-id') || generateId();

    // Create new block
    const newElement = this.createBlock(newType, { id } as Partial<BlockData>);
    if (!newElement) return null;

    // Transfer content if the new block is editable
    if (newDefinition.editable) {
      const editableChild = newElement.querySelector('[contenteditable="true"]') || newElement;
      if (editableChild instanceof HTMLElement) {
        editableChild.innerHTML = content;
      }
    }

    return newElement;
  }
}

// Singleton instance
export const blockRegistry = new BlockRegistry();

// Export class for testing
export { BlockRegistry };
