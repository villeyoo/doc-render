import { useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import type { ParsedDocument } from '@/shared/types'
import {
  DOC_FONT_FALLBACK,
  fontClassNameFromFont,
  googleFontsFamilyParam,
  normalizeHexColor
} from '@/lib/docxStyles'
import { ENABLE_GOOGLE_FONTS } from '@/shared/constants'

interface DocumentViewerProps {
  document: ParsedDocument
}

export function DocumentViewer({ document }: DocumentViewerProps) {
  const fontSizeStyles = document.fontSizes?.length
    ? document.fontSizes
        .map((size) => `.doc-font-${size}{font-size:calc(var(--doc-font-scale) * ${size}pt);}`)
        .join('')
    : ''

  const fontFamilyStyles = useMemo(() => {
    if (!document.fonts?.length) {
      return ''
    }

    return document.fonts
      .map((font) => {
        const className = fontClassNameFromFont(font)
        const safeFont = font.replace(/'/g, "\\'")
        return `.doc-font-${className}{font-family:'${safeFont}', ${DOC_FONT_FALLBACK};}`
      })
      .join('')
  }, [document.fonts])

  const colorStyles = useMemo(() => {
    if (!document.colors?.length) {
      return ''
    }

    const colors = document.colors.map((color) => normalizeHexColor(color))
    const vars = colors.map((color) => `--doc-color-${color}:#${color};`).join('')
    const darkVars = colors
      .map((color) => `--doc-color-${color}:color-mix(in srgb, #${color} 72%, white);`)
      .join('')
    const classes = colors
      .map((color) => `.doc-color-${color}{color:var(--doc-color-${color});}`)
      .join('')

    return `.document-content{${vars}}@media (prefers-color-scheme: dark){.document-content{${darkVars}}}${classes}`
  }, [document.colors])
  const processedHtml = useMemo(() => {
    if (!document.html.includes('<table')) {
      return document.html
    }

    const parser = new DOMParser()
    const parsed = parser.parseFromString(document.html, 'text/html')

    parsed.querySelectorAll('script, iframe, object, embed').forEach((node) => node.remove())
    parsed.querySelectorAll('*').forEach((node) => {
      Array.from(node.attributes).forEach((attr) => {
        if (attr.name.toLowerCase().startsWith('on')) {
          node.removeAttribute(attr.name)
          return
        }
        const attrName = attr.name.toLowerCase()
        if (attrName === 'href' || attrName === 'src') {
          const value = attr.value.trim().toLowerCase()
          if (value.startsWith('javascript:') || value.startsWith('vbscript:')) {
            node.removeAttribute(attr.name)
            return
          }
          if (value.startsWith('data:') && !value.startsWith('data:image/')) {
            node.removeAttribute(attr.name)
          }
        }
      })
    })

    const tables = parsed.querySelectorAll('table')

    tables.forEach((table) => {
      const firstRow = table.querySelector('tr')
      const cellCount = firstRow ? firstRow.children.length : 0
      const rowCount = table.querySelectorAll('tr').length
      const hasHeadings = table.querySelector('h1, h2, h3, h4, h5') !== null
      const cells = table.querySelectorAll('th, td')
      const hasSpanCells = Array.from(cells).some((cell) =>
        cell.hasAttribute('rowspan') || cell.hasAttribute('colspan')
      )

      if (!hasSpanCells && (hasHeadings || (cellCount === 2 && rowCount >= 2))) {
        table.classList.add('doc-layout-table')
      }
    })

    return parsed.body.innerHTML
  }, [document.html])

  useEffect(() => {
    if (!ENABLE_GOOGLE_FONTS || !document.fonts?.length) {
      return
    }

    const head = window.document.head
    if (!head) {
      return
    }

    document.fonts.forEach((font) => {
      const className = fontClassNameFromFont(font)
      const linkId = `docrender-font-${className}`
      if (window.document.getElementById(linkId)) {
        return
      }

      const link = window.document.createElement('link')
      link.id = linkId
      link.rel = 'stylesheet'
      link.href = `https://fonts.googleapis.com/css2?family=${googleFontsFamilyParam(font)}&display=swap`
      link.crossOrigin = 'anonymous'
      head.appendChild(link)
    })
  }, [document.fonts])

  const dynamicStyles = [fontSizeStyles, fontFamilyStyles, colorStyles]
    .filter(Boolean)
    .join('')

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      {dynamicStyles && <style>{dynamicStyles}</style>}

      {/* Warnings */}
      {document.warnings.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-4 rounded-lg theme-warning-soft p-4 text-sm"
        >
          <p className="mb-1 font-medium">Document warnings:</p>
          <ul className="list-inside list-disc space-y-1">
            {document.warnings.slice(0, 3).map((warning, i) => (
              <li key={i}>{warning}</li>
            ))}
            {document.warnings.length > 3 && (
              <li>...and {document.warnings.length - 3} more</li>
            )}
          </ul>
        </motion.div>
      )}

      {/* Document content */}
      <div
        className="document-content"
        dangerouslySetInnerHTML={{ __html: processedHtml }}
      />
    </motion.div>
  )
}
