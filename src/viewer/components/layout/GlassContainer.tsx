import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface GlassContainerProps extends HTMLMotionProps<'div'> {
  children: ReactNode
  variant?: 'default' | 'solid' | 'dark'
  className?: string
}

const variants = {
  default: 'glass-panel',
  solid: 'glass-panel-solid',
  dark: 'glass-panel glass-dark'
}

export function GlassContainer({
  children,
  variant = 'solid',
  className,
  ...props
}: GlassContainerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.5,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      className={cn(variants[variant], 'p-6', className)}
      {...props}
    >
      {children}
    </motion.div>
  )
}
