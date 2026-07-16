import { useState, useEffect } from 'react'

// ── Core hook ─────────────────────────────────────────────────────────────────
// Generic media-query hook. SSR-safe (defaults to false when `window` isn't
// available), and subscribes/unsubscribes cleanly via the modern
// addEventListener/removeEventListener API on MediaQueryList.
export function useMediaQuery(query) {
  const getMatch = () =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia(query).matches
      : false

  const [matches, setMatches] = useState(getMatch)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia(query)

    setMatches(mql.matches)

    const handler = (e) => setMatches(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [query])

  return matches
}

// ── Breakpoint tokens ─────────────────────────────────────────────────────────
export const BREAKPOINTS = {
  mobile: 640,   // < 640px
  tablet: 1024,  // 640px – 1023px
  // desktop: >= 1024px
}

// ── Convenience hooks ─────────────────────────────────────────────────────────
export function useIsMobile() {
  return useMediaQuery(`(max-width: ${BREAKPOINTS.mobile - 1}px)`)
}

export function useIsTablet() {
  return useMediaQuery(
    `(min-width: ${BREAKPOINTS.mobile}px) and (max-width: ${BREAKPOINTS.tablet - 1}px)`
  )
}

export function useIsDesktop() {
  return useMediaQuery(`(min-width: ${BREAKPOINTS.tablet}px)`)
}

// Handy when mobile+tablet should share a "not full desktop nav" treatment.
export function useIsCompact() {
  return useMediaQuery(`(max-width: ${BREAKPOINTS.tablet - 1}px)`)
}