import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { FileText, Download, ExternalLink, X } from 'lucide-react'
import type { DocumentMeta } from '@/shared/types'
import { formatFileSize, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface HeaderProps {
  meta?: DocumentMeta
  className?: string
}

export const Header = forwardRef<HTMLElement, HeaderProps>(({ meta, className }, ref) => {
  const hasRemoteSource = Boolean(
    meta?.originalUrl && !meta.originalUrl.startsWith('local://')
  )

  const handleDownload = () => {
    if (hasRemoteSource && meta?.originalUrl) {
      chrome.downloads.download({ url: meta.originalUrl })
    }
  }

  const handleOpenOriginal = () => {
    if (hasRemoteSource && meta?.originalUrl) {
      window.open(meta.originalUrl, '_blank')
    }
  }

  const handleClose = () => {
    window.close()
  }

  return (
    <motion.header
      ref={ref}
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn('glass-panel-solid px-6 py-4', className)}
    >
      <div className="flex items-center justify-between">
        {/* Logo and title */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl theme-accent-bg shadow-md">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold theme-text-strong">
              {meta?.filename || 'DocRender'}
            </h1>
            {meta && (
              <p className="text-xs theme-text-subtle">
                {formatFileSize(meta.size)} • {formatDate(meta.createdAt)}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {hasRemoteSource && (
            <>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium theme-text-muted transition-colors hover:bg-[color:var(--color-hover)] hover:text-[color:var(--color-text-strong)]"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Download</span>
              </button>
              <button
                onClick={handleOpenOriginal}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium theme-text-muted transition-colors hover:bg-[color:var(--color-hover)] hover:text-[color:var(--color-text-strong)]"
              >
                <ExternalLink className="h-4 w-4" />
                <span className="hidden sm:inline">Original</span>
              </button>
            </>
          )}
          <button
            onClick={handleClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg theme-text-subtle transition-colors hover:bg-[color:var(--color-hover)] hover:text-[color:var(--color-text-strong)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </motion.header>
  )
})

Header.displayName = 'Header'
