interface ControlsProps {
  maxDepth: number
  includeCoreqs: boolean
  onMaxDepthChange: (value: number) => void
  onIncludeCoreqsChange: (value: boolean) => void
  onZoomIn: () => void
  onZoomOut: () => void
  onResetView: () => void
}

export function Controls({
  maxDepth,
  includeCoreqs,
  onMaxDepthChange,
  onIncludeCoreqsChange,
  onZoomIn,
  onZoomOut,
  onResetView,
}: ControlsProps) {
  return (
    <article className="app-panel controls-bar" aria-label="Graph controls">
      <div className="controls-row">
        <label className="controls-label">
          <span className="controls-label-text">Max course depth</span>
          <input
            type="number"
            min={0}
            max={4}
            value={maxDepth}
            className="controls-number-input"
            onChange={(event) => onMaxDepthChange(Math.max(0, Number(event.target.value) || 0))}
          />
        </label>
        <label className="controls-label controls-checkbox">
          <input
            type="checkbox"
            checked={includeCoreqs}
            onChange={(event) => onIncludeCoreqsChange(event.target.checked)}
          />
          <span className="controls-label-text">Include coreqs</span>
        </label>
        <div className="controls-actions">
          <button type="button" className="controls-button" onClick={onZoomIn}>
            Zoom in
          </button>
          <button type="button" className="controls-button" onClick={onZoomOut}>
            Zoom out
          </button>
          <button type="button" className="controls-button" onClick={onResetView}>
            Reset view
          </button>
        </div>
      </div>
    </article>
  )
}
