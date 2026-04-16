interface ControlsProps {
  maxDepth: number
  includeCoreqs: boolean
  onMaxDepthChange: (value: number) => void
  onIncludeCoreqsChange: (value: boolean) => void
}

export function Controls({
  maxDepth,
  includeCoreqs,
  onMaxDepthChange,
  onIncludeCoreqsChange,
}: ControlsProps) {
  return (
    <section className="controls-panel" aria-label="Graph controls">
      <label className="controls-toggle">
        <input
          type="checkbox"
          checked={includeCoreqs}
          onChange={(event) => onIncludeCoreqsChange(event.target.checked)}
        />
        <span>Include corequisites</span>
      </label>
      <label className="controls-select-row">
        <span>Max depth</span>
        <select
          value={maxDepth}
          onChange={(event) => onMaxDepthChange(Number(event.target.value))}
        >
          {[0, 1, 2, 3, 4].map((depth) => (
            <option key={depth} value={depth}>
              {depth}
            </option>
          ))}
        </select>
      </label>
    </section>
  )
}
