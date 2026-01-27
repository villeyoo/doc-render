import { motion } from 'framer-motion'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface ErrorStateProps {
  message: string
  onRetry?: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[color:var(--color-danger)] text-white shadow-lg"
      >
        <AlertCircle className="h-10 w-10 text-white" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="text-center"
      >
        <h2 className="mb-2 text-xl font-semibold theme-text-strong">
          Failed to load document
        </h2>
        <p className="mb-6 max-w-md theme-text-muted">{message}</p>

        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-xl theme-accent-bg px-6 py-3 font-medium shadow-md transition-all hover:shadow-lg"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        )}
      </motion.div>
    </div>
  )
}
