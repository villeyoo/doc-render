import { useState, useEffect, useCallback } from 'react'
import type { DocumentState, DocumentMeta } from '@/shared/types'
import { convertDocxToHtml } from '@/lib/mammoth'

interface DocumentResponse {
  success: boolean
  document?: {
    id: string
    filename: string
    originalUrl: string
    data: number[]
    mimeType: string
    size: number
    createdAt: number
    lastAccessedAt: number
  }
  error?: string
}

export function useDocument(documentId: string | null) {
  const [state, setState] = useState<DocumentState>({ status: 'loading' })

  const loadDocument = useCallback(async (id: string) => {
    setState({ status: 'loading' })

    try {
      // Request document from background script
      const response = await new Promise<DocumentResponse>((resolve, reject) => {
        chrome.runtime.sendMessage(
          { type: 'GET_DOCUMENT', documentId: id },
          (res: DocumentResponse) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message))
              return
            }
            resolve(res)
          }
        )
      })

      if (!response || !response.success || !response.document) {
        setState({
          status: 'error',
          message: response?.error || 'Document not found'
        })
        return
      }

      setState({ status: 'parsing' })

      // Convert array back to ArrayBuffer
      const uint8Array = new Uint8Array(response.document.data)
      const arrayBuffer = uint8Array.buffer

      const filename = response.document.filename.toLowerCase()
      const mimeType = response.document.mimeType
      const isDocx = mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || filename.endsWith('.docx')

      if (!isDocx) {
        if (mimeType === 'application/msword' || filename.endsWith('.doc')) {
          throw new Error('Формат .doc больше не поддерживается. Сохраните файл как .docx.')
        }
        throw new Error('Поддерживаются только файлы .docx')
      }

      const parsed = await convertDocxToHtml(arrayBuffer)

      const meta: DocumentMeta = {
        id: response.document.id,
        filename: response.document.filename,
        originalUrl: response.document.originalUrl,
        mimeType: response.document.mimeType,
        size: response.document.size,
        createdAt: response.document.createdAt
      }

      setState({
        status: 'success',
        document: parsed,
        meta
      })
    } catch (error) {
      setState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to load document'
      })
    }
  }, [])

  useEffect(() => {
    if (documentId) {
      loadDocument(documentId)
    } else {
      setState({
        status: 'error',
        message: 'No document ID provided'
      })
    }
  }, [documentId, loadDocument])

  const retry = useCallback(() => {
    if (documentId) {
      loadDocument(documentId)
    }
  }, [documentId, loadDocument])

  return { state, retry }
}
