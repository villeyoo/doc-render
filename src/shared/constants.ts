// Supported file extensions
export const SUPPORTED_EXTENSIONS = ['.docx'] as const

// MIME types for supported formats
export const SUPPORTED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
] as const

// IndexedDB configuration
export const DB_NAME = 'DocRenderDB'
export const DB_VERSION = 2
export const STORE_NAME = 'documents'

// Maximum document age (24 hours) for auto-cleanup
export const MAX_DOCUMENT_AGE_MS = 24 * 60 * 60 * 1000
