interface LoadingStateProps {
  message?: string
}

export function LoadingState({ message }: LoadingStateProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-[color:var(--color-border)] border-t-[color:var(--color-accent-primary)]"
        aria-label={message || 'Loading'}
      />
    </div>
  )
}
