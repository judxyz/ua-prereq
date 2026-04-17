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
    <article style={{ margin: 0 }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.85rem 1rem',
          alignItems: 'center',
        }}
      >
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: 0 }}>
          Max course depth
          <input
            type="number"
            min={0}
            max={4}
            value={maxDepth}
            style={{ width: '5rem', marginBottom: 0 }}
            onChange={(event) => onMaxDepthChange(Math.max(0, Number(event.target.value) || 0))}
          />
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.55rem', marginBottom: 0 }}>
          <input
            type="checkbox"
            checked={includeCoreqs}
            style={{ margin: 0 }}
            onChange={(event) => onIncludeCoreqsChange(event.target.checked)}
          />
          Include coreqs
        </label>
      </div>
      <div
        role="group"
        style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', marginTop: '0.75rem' }}
      >
        <button type="button" style={{ marginBottom: 0 }} onClick={onZoomIn}>
          Zoom in
        </button>
        <button type="button" style={{ marginBottom: 0 }} onClick={onZoomOut}>
          Zoom out
        </button>
        <button type="button" style={{ marginBottom: 0 }} onClick={onReset}>
          Reset view
        </button>
      </div>
    </article>
  )
}
