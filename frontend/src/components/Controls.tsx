interface ControlsProps {
  maxDepth: number
  includeCoreqs: boolean
  onMaxDepthChange: (value: number) => void
  onIncludeCoreqsChange: (value: boolean) => void
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
}

export function Controls({
  maxDepth,
  includeCoreqs,
  onMaxDepthChange,
  onIncludeCoreqsChange,
  onZoomIn,
  onZoomOut,
  onReset,
}: ControlsProps) {
  return (
    <section className="panel controls">
      <div className="controls-row">
        <label>
          Max depth
          <input
            type="number"
            min={1}
            max={10}
            value={maxDepth}
            onChange={(event) => onMaxDepthChange(Number(event.target.value) || 1)}
          />
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={includeCoreqs}
            onChange={(event) => onIncludeCoreqsChange(event.target.checked)}
          />
          Include coreqs
        </label>
      </div>
      <div className="controls-row">
        <button type="button" onClick={onZoomIn}>
          Zoom in
        </button>
        <button type="button" onClick={onZoomOut}>
          Zoom out
        </button>
        <button type="button" onClick={onReset}>
          Reset view
        </button>
      </div>
    </section>
  )
}
