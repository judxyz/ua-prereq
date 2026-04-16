import { useState } from 'react'

const SCALE_STEP = 0.15
const MIN_SCALE = 0.4
const MAX_SCALE = 2.5

export interface ZoomPanState {
  scale: number
  translateX: number
  translateY: number
  setScale: (value: number) => void
  setTranslateX: (value: number) => void
  setTranslateY: (value: number) => void
  zoomIn: () => void
  zoomOut: () => void
  reset: () => void
}

export function useZoomPan(): ZoomPanState {
  const [scale, setScaleState] = useState(1)
  const [translateX, setTranslateX] = useState(40)
  const [translateY, setTranslateY] = useState(40)

  function clampScale(value: number) {
    return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value))
  }

  function setScale(value: number) {
    setScaleState(clampScale(value))
  }

  function zoomIn() {
    setScaleState((current) => clampScale(current + SCALE_STEP))
  }

  function zoomOut() {
    setScaleState((current) => clampScale(current - SCALE_STEP))
  }

  function reset() {
    setScaleState(1)
    setTranslateX(40)
    setTranslateY(40)
  }

  return {
    scale,
    translateX,
    translateY,
    setScale,
    setTranslateX,
    setTranslateY,
    zoomIn,
    zoomOut,
    reset,
  }
}
