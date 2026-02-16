/**
 * Components Index
 */

export { 
  AuthorlyEditor,
  ContentBlocksEditor, // @deprecated - Use AuthorlyEditor instead
  type EditorRef 
} from './Editor';
export { 
  AuthorlyRenderer,
  ContentBlocksRenderer, // @deprecated - Use AuthorlyRenderer instead
  type AuthorlyRendererProps,
  type ContentBlocksRendererProps // @deprecated - Use AuthorlyRendererProps instead
} from './Renderer';
export { 
  AuthorlyTOC,
  TableOfContents, // @deprecated - Use AuthorlyTOC instead
  parseHeadings, 
  type TocItem, 
  type AuthorlyTOCProps,
  type TableOfContentsProps // @deprecated - Use AuthorlyTOCProps instead
} from './TableOfContents';
export { Toolbar } from './Toolbar';
export { BlockMenu } from './BlockMenu';
export { BlockWrapper } from './BlockWrapper';
export { StatusBar, calculateReadingTime, type StatusBarProps } from './StatusBar';
export { MetadataPanel, type EditorMetadata, type MetadataPanelProps } from './MetadataPanel';

