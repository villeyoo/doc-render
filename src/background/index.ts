import { getDocument, getAllDocuments, deleteDocument, cleanupOldDocuments, saveDocument } from './storage'
import type { StoredDocument } from '@/shared/types'

// Cleanup old documents on startup
cleanupOldDocuments()
  .then(count => {
    if (count > 0) {
      console.log(`[DocRender] Cleaned up ${count} old documents`)
    }
  })
  .catch(console.error)

// Handle messages from other parts of the extension
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_DOCUMENT') {
    getDocument(message.documentId)
      .then(doc => {
        if (doc) {
          // Convert ArrayBuffer to array for message passing
          const data = Array.from(new Uint8Array(doc.data))
          sendResponse({
            success: true,
            document: {
              ...doc,
              data
            }
          })
        } else {
          sendResponse({
            success: false,
            error: 'Document not found'
          })
        }
      })
      .catch(error => {
        sendResponse({
          success: false,
          error: error.message
        })
      })
    return true // Keep channel open for async response
  }

  if (message.type === 'GET_ALL_DOCUMENTS') {
    getAllDocuments()
      .then(docs => {
        // Return metadata only (without binary data)
        const metadata = docs.map(doc => ({
          id: doc.id,
          filename: doc.filename,
          originalUrl: doc.originalUrl,
          mimeType: doc.mimeType,
          size: doc.size,
          createdAt: doc.createdAt,
          lastAccessedAt: doc.lastAccessedAt
        }))
        sendResponse({ success: true, documents: metadata })
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message })
      })
    return true
  }

  if (message.type === 'DELETE_DOCUMENT') {
    deleteDocument(message.documentId)
      .then(() => {
        sendResponse({ success: true })
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message })
      })
    return true
  }

  if (message.type === 'CLEANUP_OLD') {
    cleanupOldDocuments()
      .then(count => {
        sendResponse({ success: true, deletedCount: count })
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message })
      })
    return true
  }

  // Handle local file uploads from popup
  if (message.type === 'SAVE_LOCAL_DOCUMENT') {
    const { filename, data, mimeType, size } = message

    // Convert array back to ArrayBuffer
    const uint8Array = new Uint8Array(data)
    const arrayBuffer = uint8Array.buffer

    const documentId = crypto.randomUUID()
    const document: StoredDocument = {
      id: documentId,
      filename,
      originalUrl: 'local://' + filename,
      data: arrayBuffer,
      mimeType,
      size,
      createdAt: Date.now(),
      lastAccessedAt: Date.now()
    }

    saveDocument(document)
      .then(() => {
        console.log('[DocRender] Local document saved:', documentId, filename)
        sendResponse({ success: true, documentId })
      })
      .catch(error => {
        console.error('[DocRender] Failed to save local document:', error)
        sendResponse({ success: false, error: error.message })
      })
    return true
  }
})

// Periodic cleanup (every 6 hours)
chrome.alarms.create('cleanup', { periodInMinutes: 360 })

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'cleanup') {
    cleanupOldDocuments()
      .then(count => {
        if (count > 0) {
          console.log(`[DocRender] Periodic cleanup: removed ${count} documents`)
        }
      })
      .catch(console.error)
  }
})

console.log('[DocRender] Background service worker started')
