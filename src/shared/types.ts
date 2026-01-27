// Document stored in IndexedDB
export interface StoredDocument {
  id: string
  filename: string
  originalUrl: string
  data: ArrayBuffer
  mimeType: string
  size: number
  createdAt: number
  lastAccessedAt: number
}

// Document metadata (without binary data)
export interface DocumentMeta {
  id: string
  filename: string
  originalUrl: string
  mimeType: string
  size: number
  createdAt: number
}

// Parsed document result
export interface ParsedDocument {
  html: string
  warnings: string[]
  fontSizes?: number[]
}

// Document state in viewer
export type DocumentState =
  | { status: 'loading' }
  | { status: 'parsing' }
  | { status: 'success'; document: ParsedDocument; meta: DocumentMeta }
  | { status: 'error'; message: string }
