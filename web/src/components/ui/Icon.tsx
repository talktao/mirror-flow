import type { ReactNode } from 'react'

export type IconName =
  | 'plus'
  | 'canvas'
  | 'search'
  | 'folder'
  | 'image'
  | 'link'
  | 'history'
  | 'sparkles'
  | 'cat'
  | 'chevron-down'
  | 'monitor'
  | 'sliders'
  | 'arrow-up'
  | 'grid'
  | 'close'
  | 'check'
  | 'text'
  | 'video'
  | 'upload'

const ICONS: Record<IconName, ReactNode> = {
  plus: <path d="M12 5v14M5 12h14" />,
  canvas: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M3 9h18M8 4v16" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.6-3.6" />
    </>
  ),
  folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m4 18 5-5 4 4 3-3 4 4" />
    </>
  ),
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" />
      <path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" />
    </>
  ),
  history: (
    <>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3 8.8" />
      <path d="M3 4v5h5M12 8v4.5l3 1.8" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
      <path d="M18.5 15.5 19.5 18l2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1z" />
    </>
  ),
  cat: (
    <>
      <path d="M4.5 9.5 6 4l3.4 2.6a8.4 8.4 0 0 1 5.2 0L18 4l1.5 5.5v5a5 5 0 0 1-5 5h-5a5 5 0 0 1-5-5z" />
      <path d="M9.2 12.4h.01M14.8 12.4h.01" />
      <path d="M10.2 15.6a2.6 2.6 0 0 0 3.6 0" />
    </>
  ),
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  monitor: (
    <>
      <rect x="2.5" y="4.5" width="19" height="12.5" rx="2.5" />
      <path d="M8.5 21h7M12 17v4" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </>
  ),
  'arrow-up': <path d="M12 19V5M6 11l6-6 6 6" />,
  grid: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="m20 6-11 11-5-5" />,
  text: <path d="M5 6h14M12 6v12M9 18h6" />,
  video: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="3" />
      <path d="m10.5 9.5 4 2.5-4 2.5z" />
    </>
  ),
  upload: <path d="M12 17V5M7.5 9.5 12 5l4.5 4.5M5 20h14" />,
}

interface IconProps {
  name: IconName
  className?: string
  strokeWidth?: number
}

export function Icon({ name, className, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  )
}
