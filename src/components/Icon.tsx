import type { SVGProps } from 'react'

export type IconName =
  | 'bell'
  | 'book'
  | 'moon'
  | 'pokeball'
  | 'refresh'
  | 'run'
  | 'search'
  | 'star'
  | 'sun'
  | 'trash'

type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName
}

export function Icon({ name, ...props }: IconProps) {
  switch (name) {
    case 'star':
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
          <path
            d="M12 2.75l2.93 6.01 6.63.95-4.8 4.67 1.14 6.6L12 17.9 6.1 20.98l1.14-6.6-4.8-4.67 6.63-.95L12 2.75z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'bell':
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
          <path
            d="M18 8.8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M10 18a2 2 0 004 0"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      )
    case 'sun':
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
          <path
            d="M12 17a5 5 0 100-10 5 5 0 000 10z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M12 2v2.25M12 19.75V22M4.22 4.22l1.6 1.6M18.18 18.18l1.6 1.6M2 12h2.25M19.75 12H22M4.22 19.78l1.6-1.6M18.18 5.82l1.6-1.6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      )
    case 'moon':
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
          <path
            d="M21 14.4A8.5 8.5 0 1110.1 3a7 7 0 0010.9 11.4z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'pokeball':
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
          <path
            d="M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path d="M2.2 12h19.6" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M12 15.2a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </svg>
      )
    case 'run':
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
          <path
            d="M14 4.5a1.6 1.6 0 11-3.2 0 1.6 1.6 0 013.2 0z"
            fill="currentColor"
          />
          <path
            d="M13 7l-2.2 2.2 2.5 1.1 1.4 2.6M8.2 21l2-6.2-1.8-2.5 2.4-2.4M16.6 21l-1.8-4.2 1.6-2.8"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'refresh':
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
          <path
            d="M20 12a8 8 0 10-2.3 5.7"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M20 7v5h-5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'book':
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
          <path
            d="M5.5 4.5h11A2 2 0 0118.5 6.5v13a2 2 0 00-2-2h-11a2 2 0 01-2-2v-9a2 2 0 012-2z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M5.5 17.5h11a2 2 0 012 2"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      )
    case 'search':
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
          <path
            d="M10.5 18a7.5 7.5 0 110-15 7.5 7.5 0 010 15z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M16.5 16.5L21 21"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      )
    case 'trash':
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
          <path
            d="M4 7h16"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M9 7V5.5A1.5 1.5 0 0110.5 4h3A1.5 1.5 0 0115 5.5V7"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M7 7l.8 14.2A2 2 0 009.8 23h4.4a2 2 0 002-1.8L17 7"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M10 11v8M14 11v8"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      )
    default:
      return null
  }
}

