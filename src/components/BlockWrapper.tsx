/**
 * Block Wrapper Component - Wraps each block with controls
 */

import React, { useState, useCallback } from 'react';
import {
  GripVertical,
  Plus,
  Trash2,
  Copy,
  MoveUp,
  MoveDown,
  MoreHorizontal,
} from 'lucide-react';
import type { BlockType } from '../core/types';

interface BlockWrapperProps {
  children: React.ReactNode;
  blockId: string;
  blockType: BlockType;
  isActive?: boolean;
  onAddBlock?: (position: 'before' | 'after') => void;
  onDeleteBlock?: () => void;
  onDuplicateBlock?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  className?: string;
}

export const BlockWrapper: React.FC<BlockWrapperProps> = ({
  children,
  blockId,
  blockType: _blockType, // Reserved for future styling
  isActive = false,
  onAddBlock,
  onDeleteBlock,
  onDuplicateBlock,
  onMoveUp,
  onMoveDown,
  onDragStart,
  className = '',
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const handleMenuToggle = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(!showMenu);
  }, [showMenu]);

  const handleAction = useCallback(
    (action?: () => void) => {
      return (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setShowMenu(false);
        if (action) action();
      };
    },
    []
  );

  return (
    <div
      className={`cb-block-wrapper ${isActive ? 'cb-block-wrapper-active' : ''} ${className}`}
      data-block-wrapper={blockId}
    >
      {/* Left side controls */}
      <div className="cb-block-controls cb-block-controls-left">
        {/* Add block button */}
        <button
          type="button"
          className="cb-block-btn cb-block-add"
          onClick={handleAction(() => onAddBlock?.('before'))}
          title="Add block above"
          tabIndex={-1}
        >
          <Plus size={14} />
        </button>

        {/* Drag handle */}
        <button
          type="button"
          className="cb-block-btn cb-block-drag"
          data-drag-handle
          draggable
          onDragStart={onDragStart}
          title="Drag to reorder"
          tabIndex={-1}
        >
          <GripVertical size={14} />
        </button>
      </div>

      {/* Block content */}
      <div className="cb-block-content">{children}</div>

      {/* Right side controls (shown on hover/active) */}
      <div className="cb-block-controls cb-block-controls-right">
        {/* More options */}
        <div className="cb-block-menu-container">
          <button
            type="button"
            className="cb-block-btn cb-block-more"
            onClick={handleMenuToggle}
            title="More options"
            tabIndex={-1}
          >
            <MoreHorizontal size={14} />
          </button>

          {showMenu && (
            <div className="cb-block-dropdown">
              <button
                type="button"
                className="cb-block-dropdown-item"
                onClick={handleAction(onDuplicateBlock)}
              >
                <Copy size={14} />
                <span>Duplicate</span>
              </button>
              <button
                type="button"
                className="cb-block-dropdown-item"
                onClick={handleAction(onMoveUp)}
              >
                <MoveUp size={14} />
                <span>Move up</span>
              </button>
              <button
                type="button"
                className="cb-block-dropdown-item"
                onClick={handleAction(onMoveDown)}
              >
                <MoveDown size={14} />
                <span>Move down</span>
              </button>
              <div className="cb-block-dropdown-divider" />
              <button
                type="button"
                className="cb-block-dropdown-item cb-block-dropdown-item-danger"
                onClick={handleAction(onDeleteBlock)}
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
