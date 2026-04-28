const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined
let isInitialized = false

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dataLayer: any[]
    gtag: (...args: unknown[]) => void
  }
}

function isAnalyticsEnabled(): boolean {
  return Boolean(measurementId) && typeof window !== 'undefined'
}

function init() {
  if (isInitialized || !isAnalyticsEnabled()) return
  isInitialized = true

  window.dataLayer = window.dataLayer || []
  // Must use `arguments` not rest params — GA4 requires IArguments objects in dataLayer
  // eslint-disable-next-line prefer-rest-params
  window.gtag = function gtag() { window.dataLayer.push(arguments) }

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
  document.head.appendChild(script)

  window.gtag('js', new Date())
  window.gtag('config', measurementId, { send_page_view: false })
}

export function trackPageView(path: string) {
  if (!isAnalyticsEnabled()) return
  init()
  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: document.title,
    page_location: window.location.href,
  })
}
