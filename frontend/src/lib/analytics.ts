const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID

declare global {
  interface Window {
    dataLayer: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

function isAnalyticsEnabled(): boolean {
  return Boolean(measurementId) && typeof window !== 'undefined'
}

function ensureTagLoaded() {
  if (!isAnalyticsEnabled()) {
    return
  }

  window.dataLayer = window.dataLayer || []

  if (!window.gtag) {
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer.push(args)
    }
  }

  const existingTag = document.querySelector(
    `script[src="https://www.googletagmanager.com/gtag/js?id=${measurementId}"]`,
  )
  if (!existingTag) {
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
    document.head.appendChild(script)
  }

  window.gtag('js', new Date())
  // We disable automatic page views and track route changes ourselves.
  window.gtag('config', measurementId, { send_page_view: false })
}

export function trackPageView(path: string) {
  if (!isAnalyticsEnabled()) {
    return
  }

  ensureTagLoaded()
  window.gtag?.('event', 'page_view', {
    page_path: path,
    page_title: document.title,
    page_location: window.location.href,
  })
}
