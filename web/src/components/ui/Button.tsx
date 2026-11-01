import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

type ButtonVariant = 'outline' | 'soft' | 'ghost' | 'primary' | 'pill'
type ButtonSize = 'sm' | 'md' | 'icon' | 'iconSm'
type ButtonShape = 'rounded' | 'pill' | 'square'

const VARIANTS: Record<ButtonVariant, string> = {
  outline: 'border border-line bg-surface text-zinc-300 hover:border-accent/50 hover:text-ink',
  soft: 'bg-accent/15 text-accent-soft hover:bg-accent/25',
  ghost: 'text-muted hover:bg-surface-2 hover:text-ink',
  primary: 'bg-gradient-to-br from-accent to-accent-soft text-white hover:opacity-90',
  pill: 'border border-line bg-surface/80 text-zinc-300 shadow-lg backdrop-blur hover:border-accent/50',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-[12px]',
  md: 'px-3.5 py-2 text-[12.5px]',
  icon: 'size-9 p-0',
  iconSm: 'size-7 p-0',
}

const SHAPES: Record<ButtonShape, string> = {
  rounded: 'rounded-xl',
  pill: 'rounded-full',
  square: 'rounded-[10px]',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  shape?: ButtonShape
  /** 双行内容等左对齐场景用 start */
  align?: 'center' | 'start'
}

/** 项目内所有按钮统一走这里，禁止在各业务组件里复制按钮样式。 */
export function Button({
  variant = 'outline',
  size = 'md',
  shape = 'rounded',
  align = 'center',
  className,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center gap-1.5 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
        align === 'start' ? 'justify-start text-left' : 'justify-center',
        VARIANTS[variant],
        SIZES[size],
        SHAPES[shape],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
