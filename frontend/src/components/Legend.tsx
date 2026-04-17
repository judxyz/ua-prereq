export function Legend() {
  return (
    <article style={{ margin: 0 }}>
      <h3>Legend</h3>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.7rem 1.25rem',
          alignItems: 'center',
          marginTop: '0.6rem',
          fontSize: '0.9rem',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <i
            aria-hidden="true"
            style={{
              display: 'inline-block',
              width: '0.95rem',
              height: '0.95rem',
              border: '1px solid #cbd5e1',
              borderRadius: '0.25rem',
              background: '#ffffff',
            }}
          />
          Course node
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <i
            aria-hidden="true"
            style={{
              display: 'inline-block',
              width: '0.95rem',
              height: '0.95rem',
              border: '1px solid #d97706',
              borderRadius: '999px',
              background: '#fff7ed',
            }}
          />
          Group node
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <i
            aria-hidden="true"
            style={{
              display: 'inline-block',
              width: '1.5rem',
              height: 0,
              borderTop: '2px solid #94a3b8',
            }}
          />
          Prerequisite edge
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <i
            aria-hidden="true"
            style={{
              display: 'inline-block',
              width: '1.5rem',
              height: 0,
              borderTop: '2px dashed #059669',
            }}
          />
          Corequisite edge
        </span>
      </div>
    </article>
  )
}
