import { SUPPORTED_EXTENSIONS, SUPPORTED_MIME_TYPES } from '@/shared/constants'
import type { StoredDocument } from '@/shared/types'
import { saveDocument, cleanupOldDocuments } from './storage'

function isSupportedDownload(item: chrome.downloads.DownloadItem): boolean {
  // Check by MIME type
  if (item.mime && SUPPORTED_MIME_TYPES.includes(item.mime as typeof SUPPORTED_MIME_TYPES[number])) {
    return true
  }

  // Check by file extension
  const filename = item.filename || item.finalUrl || item.url
  const extension = filename?.split('.').pop()?.toLowerCase()
  if (extension && SUPPORTED_EXTENSIONS.includes(`.${extension}` as typeof SUPPORTED_EXTENSIONS[number])) {
    return true
  }

  return false
}

function extractFilename(item: chrome.downloads.DownloadItem): string {
  if (item.filename) {
    // Extract just the filename from full path
    return item.filename.split(/[\\/]/).pop() || 'document.docx'
  }

  // Try to extract from URL
  const url = item.finalUrl || item.url
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    const filename = pathname.split('/').pop()
    if (filename && filename.includes('.')) {
      return decodeURIComponent(filename)
    }
  } catch {
    // URL parsing failed
  }

  return 'document.docx'
}

async function processDownload(item: chrome.downloads.DownloadItem): Promise<void> {
  const url = item.finalUrl || item.url

  console.log('[DocRender] Processing download:', url)

  try {
    // Fetch the file
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const documentId = crypto.randomUUID()
    const filename = extractFilename(item)

    // Save to IndexedDB
    const document: StoredDocument = {
      id: documentId,
      filename,
      originalUrl: url,
      data: arrayBuffer,
      mimeType: item.mime || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: arrayBuffer.byteLength,
      createdAt: Date.now(),
      lastAccessedAt: Date.now()
    }

    await saveDocument(document)
    console.log('[DocRender] Document saved:', documentId, filename)

    // Open viewer in new tab
    const viewerUrl = chrome.runtime.getURL(`src/viewer/index.html?documentId=${documentId}`)
    await chrome.tabs.create({ url: viewerUrl })

  } catch (error) {
    console.error('[DocRender] Failed to process document:', error)

    // Fallback: let the browser download normally
    // Re-download since we cancelled it
    chrome.downloads.download({ url })
  }
}

export function initDownloadInterceptor(): void {
  // Cleanup old documents on startup
  cleanupOldDocuments()
    .then(count => {
      if (count > 0) {
        console.log(`[DocRender] Cleaned up ${count} old documents`)
      }
    })
    .catch(console.error)

  // Listen for new downloads
  chrome.downloads.onCreated.addListener((downloadItem) => {
    // Skip downloads initiated by this extension (e.g., fallback or manual download)
    if (downloadItem.byExtensionId === chrome.runtime.id) {
      return
    }

    if (!isSupportedDownload(downloadItem)) {
      return
    }

    console.log('[DocRender] Intercepted download:', downloadItem)

    // Cancel the download
    chrome.downloads.cancel(downloadItem.id)
      .then(() => {
        // Remove from download history
        chrome.downloads.erase({ id: downloadItem.id })
      })
      .catch(console.error)

    // Process the document
    processDownload(downloadItem)
  })

  console.log('[DocRender] Download interceptor initialized')
}
