/**
 * Table Block
 */

import type { BlockDefinition, TableData, TableRow, TableCell } from '../core/types';
import { generateId } from '../utils/helpers';

export const tableBlock: BlockDefinition = {
  name: 'table',
  tag: 'table',
  editable: true,
  allowedChildren: ['text', 'inline'],
  className: 'cb-table',
  icon: 'table',
  label: 'Table',

  create(data?: TableData): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'cb-table-wrapper';
    wrapper.setAttribute('data-block-id', data?.id || generateId());
    wrapper.setAttribute('data-block-type', 'table');

    const table = document.createElement('table');
    table.className = 'cb-table';

    // Default: 3x3 table if no data
    const rows = data?.rows || [
      { cells: [{ content: '' }, { content: '' }, { content: '' }] },
      { cells: [{ content: '' }, { content: '' }, { content: '' }] },
      { cells: [{ content: '' }, { content: '' }, { content: '' }] },
    ];

    const hasHeader = data?.hasHeader ?? true;

    rows.forEach((row, rowIndex) => {
      const tr = document.createElement('tr');
      tr.className = 'cb-table-row';

      row.cells.forEach(cell => {
        const cellTag = hasHeader && rowIndex === 0 ? 'th' : 'td';
        const td = document.createElement(cellTag);
        td.className = 'cb-table-cell';
        td.setAttribute('contenteditable', 'true');
        td.innerHTML = cell.content || '';
        
        if (cell.align) {
          td.style.textAlign = cell.align;
        }
        if (cell.colSpan && cell.colSpan > 1) {
          td.colSpan = cell.colSpan;
        }
        if (cell.rowSpan && cell.rowSpan > 1) {
          td.rowSpan = cell.rowSpan;
        }

        tr.appendChild(td);
      });

      table.appendChild(tr);
    });

    wrapper.appendChild(table);

    // Table controls
    const controls = document.createElement('div');
    controls.className = 'cb-table-controls';
    controls.innerHTML = `
      <button type="button" class="cb-table-btn" data-action="addRow" title="Add row">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14"/><path d="M5 12h14"/>
        </svg>
        Row
      </button>
      <button type="button" class="cb-table-btn" data-action="addCol" title="Add column">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14"/><path d="M5 12h14"/>
        </svg>
        Column
      </button>
      <button type="button" class="cb-table-btn cb-table-btn-danger" data-action="deleteRow" title="Delete row">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 12h14"/>
        </svg>
        Row
      </button>
      <button type="button" class="cb-table-btn cb-table-btn-danger" data-action="deleteCol" title="Delete column">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 12h14"/>
        </svg>
        Column
      </button>
    `;
    wrapper.appendChild(controls);

    return wrapper;
  },

  getData(element: HTMLElement): TableData {
    const table = element.querySelector('table');
    const rows: TableRow[] = [];
    let hasHeader = false;

    table?.querySelectorAll('tr').forEach((tr, rowIndex) => {
      const cells: TableCell[] = [];
      
      tr.querySelectorAll('th, td').forEach(cell => {
        if (cell.tagName === 'TH') hasHeader = true;
        
        cells.push({
          content: cell.innerHTML,
          align: (cell as HTMLTableCellElement).style.textAlign as TableCell['align'] || undefined,
          colSpan: (cell as HTMLTableCellElement).colSpan > 1 ? (cell as HTMLTableCellElement).colSpan : undefined,
          rowSpan: (cell as HTMLTableCellElement).rowSpan > 1 ? (cell as HTMLTableCellElement).rowSpan : undefined,
        });
      });

      rows.push({ cells });
    });

    return {
      id: element.getAttribute('data-block-id') || generateId(),
      type: 'table',
      rows,
      hasHeader,
    };
  },

  update(element: HTMLElement, data: Partial<TableData>): void {
    if (data.rows) {
      const table = element.querySelector('table');
      if (table) {
        table.innerHTML = '';
        
        data.rows.forEach((row, rowIndex) => {
          const tr = document.createElement('tr');
          tr.className = 'cb-table-row';

          row.cells.forEach(cell => {
            const cellTag = data.hasHeader && rowIndex === 0 ? 'th' : 'td';
            const td = document.createElement(cellTag);
            td.className = 'cb-table-cell';
            td.setAttribute('contenteditable', 'true');
            td.innerHTML = cell.content || '';
            
            if (cell.align) td.style.textAlign = cell.align;
            if (cell.colSpan) td.colSpan = cell.colSpan;
            if (cell.rowSpan) td.rowSpan = cell.rowSpan;

            tr.appendChild(td);
          });

          table.appendChild(tr);
        });
      }
    }
  },
};

/**
 * Add row to table
 */
export function addTableRow(wrapper: HTMLElement, afterIndex?: number): void {
  const table = wrapper.querySelector('table');
  if (!table) return;

  const rows = table.querySelectorAll('tr');
  const colCount = rows[0]?.querySelectorAll('th, td').length || 3;

  const tr = document.createElement('tr');
  tr.className = 'cb-table-row';

  for (let i = 0; i < colCount; i++) {
    const td = document.createElement('td');
    td.className = 'cb-table-cell';
    td.setAttribute('contenteditable', 'true');
    tr.appendChild(td);
  }

  if (afterIndex !== undefined && rows[afterIndex]) {
    rows[afterIndex].after(tr);
  } else {
    table.appendChild(tr);
  }
}

/**
 * Add column to table
 */
export function addTableColumn(wrapper: HTMLElement, afterIndex?: number): void {
  const table = wrapper.querySelector('table');
  if (!table) return;

  table.querySelectorAll('tr').forEach((tr, rowIndex) => {
    const cells = tr.querySelectorAll('th, td');
    const isHeader = rowIndex === 0 && cells[0]?.tagName === 'TH';
    
    const cell = document.createElement(isHeader ? 'th' : 'td');
    cell.className = 'cb-table-cell';
    cell.setAttribute('contenteditable', 'true');

    if (afterIndex !== undefined && cells[afterIndex]) {
      cells[afterIndex].after(cell);
    } else {
      tr.appendChild(cell);
    }
  });
}

/**
 * Delete row from table
 */
export function deleteTableRow(wrapper: HTMLElement, index: number): boolean {
  const table = wrapper.querySelector('table');
  if (!table) return false;

  const rows = table.querySelectorAll('tr');
  if (rows.length <= 1) return false; // Keep at least one row

  rows[index]?.remove();
  return true;
}

/**
 * Delete column from table
 */
export function deleteTableColumn(wrapper: HTMLElement, index: number): boolean {
  const table = wrapper.querySelector('table');
  if (!table) return false;

  const rows = table.querySelectorAll('tr');
  const colCount = rows[0]?.querySelectorAll('th, td').length || 0;
  if (colCount <= 1) return false; // Keep at least one column

  rows.forEach(tr => {
    const cells = tr.querySelectorAll('th, td');
    cells[index]?.remove();
  });

  return true;
}

/**
 * Set cell alignment
 */
export function setCellAlignment(
  cell: HTMLTableCellElement,
  align: 'left' | 'center' | 'right'
): void {
  cell.style.textAlign = align;
}

/**
 * Get currently focused cell
 */
export function getFocusedCell(wrapper: HTMLElement): HTMLTableCellElement | null {
  const activeElement = document.activeElement;
  if (activeElement && wrapper.contains(activeElement)) {
    const cell = activeElement.closest('td, th');
    return cell as HTMLTableCellElement | null;
  }
  return null;
}

/**
 * Get cell position (row, col)
 */
export function getCellPosition(cell: HTMLTableCellElement): { row: number; col: number } | null {
  const tr = cell.parentElement as HTMLTableRowElement;
  if (!tr) return null;

  const table = tr.closest('table');
  if (!table) return null;

  const rows = Array.from(table.querySelectorAll('tr'));
  const row = rows.indexOf(tr);

  const cells = Array.from(tr.querySelectorAll('th, td'));
  const col = cells.indexOf(cell);

  return { row, col };
}
