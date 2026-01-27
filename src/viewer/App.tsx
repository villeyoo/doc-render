import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Header } from './components/layout/Header'
import { GlassContainer } from './components/layout/GlassContainer'
import { DocumentViewer } from './components/viewer/DocumentViewer'
import { LoadingState } from './components/viewer/LoadingState'
import { ErrorState } from './components/viewer/ErrorState'
import { useDocument } from './hooks/useDocument'

function App() {
  // Get document ID from URL
  const documentId = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('documentId')
  }, [])

  const { state, retry } = useDocument(documentId)
  const headerRef = useRef<HTMLElement | null>(null)
  const [isHeaderVisible, setIsHeaderVisible] = useState(true)

  useEffect(() => {
    const header = headerRef.current
    if (!header) {
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsHeaderVisible(entry.isIntersecting)
      },
      { threshold: 0.1 }
    )

    observer.observe(header)
    return () => observer.disconnect()
  }, [])

  // Update page title
  if (state.status === 'success') {
    document.title = `${state.meta.filename} - DocRender`
  }

  const frameClass = 'mx-auto w-full max-w-[1296px] px-4 sm:px-6'

  return (
    <div className="min-h-screen theme-bg">
      <AnimatePresence>
        {state.status === 'success' && !isHeaderVisible && (
          <div className="pointer-events-none fixed inset-x-0 top-2.5 z-50 flex justify-center">
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="glass-panel-solid rounded-full px-4 py-2 text-xs font-medium theme-text-strong shadow-sm"
            >
              {state.meta.filename}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="relative pb-10">
        <div className={`${frameClass} pt-6`}>
          <Header
            ref={headerRef}
            meta={state.status === 'success' ? state.meta : undefined}
          />
        </div>

        <main className={`${frameClass} py-6`}>
          <GlassContainer className="min-h-[60vh]">
            {state.status === 'loading' && <LoadingState />}

            {state.status === 'parsing' && <LoadingState />}

            {state.status === 'error' && (
              <ErrorState message={state.message} onRetry={retry} />
            )}

            {state.status === 'success' && (
              <DocumentViewer document={state.document} />
            )}
          </GlassContainer>
        </main>

        {/* Footer */}
        <footer className="pb-8 text-center text-sm theme-text-subtle">
          DocRender • Fast document viewer
        </footer>
      </div>
    </div>
  )
}

export default App
