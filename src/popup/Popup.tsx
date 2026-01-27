import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Trash2, Clock, ExternalLink, Upload, File, X, Loader2 } from 'lucide-react'
import type { DocumentMeta } from '@/shared/types'
import { formatFileSize } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface DocumentListResponse {
  success: boolean
  documents?: (DocumentMeta & { lastAccessedAt: number })[]
  error?: string
}

interface SaveDocumentResponse {
  success: boolean
  documentId?: string
  error?: string
}

function Popup() {
  const [documents, setDocuments] = useState<(DocumentMeta & { lastAccessedAt: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = () => {
    chrome.runtime.sendMessage(
      { type: 'GET_ALL_DOCUMENTS' },
      (response: DocumentListResponse) => {
        if (chrome.runtime.lastError) {
          setError(chrome.runtime.lastError.message ?? 'Extension error')
          setLoading(false)
          return
        }

        if (response && response.success && response.documents) {
          const sorted = response.documents.sort(
            (a, b) => b.lastAccessedAt - a.lastAccessedAt
          )
          setDocuments(sorted)
        } else if (response && response.error) {
          setError(response.error)
        }
        setLoading(false)
      }
    )
  }

  const processFile = useCallback(async (file: File) => {
    const lowerName = file.name.toLowerCase()
    // Validate file type
    if (!lowerName.endsWith('.docx')) {
      setError('Please select a .docx file')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer()

      // Convert to array for message passing
      const data = Array.from(new Uint8Array(arrayBuffer))

      // Send to background script to save
      const response = await new Promise<SaveDocumentResponse>((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            type: 'SAVE_LOCAL_DOCUMENT',
            filename: file.name,
            data: data,
            mimeType: file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            size: file.size
          },
          (res: SaveDocumentResponse) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message))
              return
            }
            resolve(res)
          }
        )
      })

      if (!response || !response.success || !response.documentId) {
        throw new Error(response?.error || 'Failed to save document')
      }

      // Open viewer
      const viewerUrl = chrome.runtime.getURL(`src/viewer/index.html?documentId=${response.documentId}`)
      await chrome.tabs.create({ url: viewerUrl })

      // Refresh document list
      loadDocuments()

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file')
    } finally {
      setIsProcessing(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      processFile(files[0])
    }
  }, [processFile])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      processFile(files[0])
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [processFile])

  const handleOpen = (id: string) => {
    const viewerUrl = chrome.runtime.getURL(`src/viewer/index.html?documentId=${id}`)
    chrome.tabs.create({ url: viewerUrl })
  }

  const handleDelete = (id: string) => {
    chrome.runtime.sendMessage(
      { type: 'DELETE_DOCUMENT', documentId: id },
      (response: { success: boolean; error?: string }) => {
        if (chrome.runtime.lastError) {
          setError(chrome.runtime.lastError.message ?? 'Extension error')
          return
        }
        if (response && response.success) {
          setDocuments(docs => docs.filter(d => d.id !== id))
        } else if (response?.error) {
          setError(response.error)
        }
      }
    )
  }

  return (
    <div className="w-96 theme-bg p-5">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl theme-accent-bg shadow-md">
          <FileText className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold theme-text-strong">DocRender</h1>
          <p className="text-sm theme-text-subtle">Fast Document Viewer</p>
        </div>
      </div>

      {/* Drop Zone */}
      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={cn(
          "relative mb-5 cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed p-6 transition-all",
          isDragging
            ? "border-[color:var(--color-accent-primary)] bg-[color:var(--color-accent-soft)]"
            : "border-[color:var(--color-border)] bg-[color:var(--color-surface)] hover:border-[color:var(--color-border-strong)] hover:bg-[color:var(--color-surface-strong)]",
          isProcessing && "pointer-events-none opacity-60"
        )}
        whileHover={{ scale: isProcessing ? 1 : 1.01 }}
        whileTap={{ scale: isProcessing ? 1 : 0.99 }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".docx"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex flex-col items-center text-center">
          <AnimatePresence mode="wait">
            {isProcessing ? (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl theme-accent-bg"
              >
                <Loader2 className="h-7 w-7 animate-spin text-white" />
              </motion.div>
            ) : isDragging ? (
              <motion.div
                key="dragging"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl theme-accent-bg"
              >
                <File className="h-7 w-7 text-white" />
              </motion.div>
            ) : (
              <motion.div
                key="upload"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--color-surface-strong)]"
              >
                <Upload className="h-7 w-7 theme-text-subtle" />
              </motion.div>
            )}
          </AnimatePresence>

          <p className="mb-1 font-medium theme-text-strong">
            {isProcessing
              ? 'Opening document...'
              : isDragging
              ? 'Drop file here'
              : 'Drop .docx file here'}
          </p>
          <p className="text-sm theme-text-subtle">
            {isProcessing ? 'Please wait' : 'or click to browse'}
          </p>
        </div>
      </motion.div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 flex items-center gap-2 rounded-xl p-3 text-sm theme-danger-soft"
          >
            <X className="h-4 w-4 shrink-0" />
            <span className="flex-1">{error}</span>
            <button
              onClick={() => setError(null)}
              className="shrink-0 rounded p-1 hover:bg-[color:var(--color-danger-soft)]"
            >
              <X className="h-3 w-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent documents */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold theme-text-muted">
          <Clock className="h-4 w-4" />
          Recent Documents
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[color:var(--color-accent-primary)]" />
          </div>
        ) : documents.length === 0 ? (
          <div className="rounded-xl bg-[color:var(--color-surface)] py-8 text-center">
            <File className="mx-auto mb-2 h-8 w-8 theme-text-subtle" />
            <p className="text-sm theme-text-muted">No documents yet</p>
            <p className="text-xs theme-text-subtle">Drop a file above to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.slice(0, 5).map((doc, index) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group flex items-center gap-3 rounded-xl bg-[color:var(--color-surface)] p-3 shadow-sm transition-all hover:bg-[color:var(--color-surface-strong)] hover:shadow-md"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl theme-accent-soft">
                  <FileText className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium theme-text-strong">
                    {doc.filename}
                  </p>
                  <p className="text-xs theme-text-subtle">
                    {formatFileSize(doc.size)}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => handleOpen(doc.id)}
                    className="rounded-lg p-2 theme-text-subtle transition-colors hover:bg-[color:var(--color-accent-soft)] hover:text-[color:var(--color-accent-secondary)]"
                    title="Open"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="rounded-lg p-2 theme-text-subtle transition-colors hover:bg-[color:var(--color-danger-soft)] hover:text-[color:var(--color-danger)]"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-5 text-center text-xs theme-text-subtle">
        Supports: .docx
      </div>
    </div>
  )
}

export default Popup
