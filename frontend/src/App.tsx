import { useState, useEffect } from 'react'
import './App.css'
import SlideEditor, { PresentationData } from './SlideEditor'

interface TraceSlide {
  trace_id: string
  trace_name: string
  created_at: string
  pptx_base64?: string
  presentation?: PresentationData
  embed_url?: string
  error?: string
}

interface TracesResponse {
  traces: TraceSlide[]
}

function App() {
  const [traces, setTraces] = useState<TraceSlide[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTrace, setSelectedTrace] = useState<TraceSlide | null>(null)

  useEffect(() => {
    fetchTraces()
  }, [])

  const fetchTraces = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/traces')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const data: TracesResponse = await response.json()
      setTraces(data.traces)
      if (data.traces.length > 0) {
        setSelectedTrace(data.traces[0])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch traces')
    } finally {
      setLoading(false)
    }
  }

  const downloadPptx = (pptxBase64: string, filename: string) => {
    const bytes = atob(pptxBase64)
    const arrayBuffer = new ArrayBuffer(bytes.length)
    const uint8Array = new Uint8Array(arrayBuffer)
    for (let i = 0; i < bytes.length; i++) {
      uint8Array[i] = bytes.charCodeAt(i)
    }
    
    const blob = new Blob([uint8Array], { 
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleSavePresentation = async (presentation: PresentationData) => {
    try {
      const response = await fetch('/api/save-presentation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presentation })
      })
      
      if (!response.ok) {
        throw new Error(`Save failed: ${response.status}`)
      }
      
      const data = await response.json()
      if (data.success && data.pptx_base64) {
        downloadPptx(data.pptx_base64, `${selectedTrace?.trace_name || 'presentation'}.pptx`)
      }
    } catch (err) {
      console.error('Save failed:', err)
      alert('Failed to save presentation')
    }
  }

  const formatDate = (isoString: string) => {
    if (!isoString) return ''
    const date = new Date(isoString)
    return date.toLocaleString()
  }

  if (loading) {
    return (
      <div className="app">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading traces from LangSmith...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app">
        <div className="error-container">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={fetchTraces}>Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Slide Editor</h1>
        <p className="subtitle">Edit and save your AI-generated presentations</p>
        <button className="refresh-btn" onClick={fetchTraces}>
          Refresh
        </button>
      </header>

      <div className="main-content">
        <aside className="sidebar">
          <h2>Recent Traces</h2>
          <ul className="trace-list">
            {traces.map((trace) => (
              <li
                key={trace.trace_id}
                className={`trace-item ${selectedTrace?.trace_id === trace.trace_id ? 'selected' : ''}`}
                onClick={() => setSelectedTrace(trace)}
              >
                <div className="trace-name">{trace.trace_name}</div>
                <div className="trace-date">{formatDate(trace.created_at)}</div>
                <div className="trace-status">
                  {trace.presentation && <span className="status-badge success">Editable</span>}
                  {trace.pptx_base64 && !trace.presentation && <span className="status-badge warning">Download Only</span>}
                  {trace.error && <span className="status-badge error">No PPTX</span>}
                </div>
              </li>
            ))}
          </ul>
        </aside>

        <main className="viewer">
          {selectedTrace ? (
            <>
              <div className="viewer-header">
                <h2>{selectedTrace.trace_name}</h2>
                <div className="viewer-actions">
                  {selectedTrace.pptx_base64 && (
                    <button onClick={() => downloadPptx(selectedTrace.pptx_base64!, `${selectedTrace.trace_name}.pptx`)}>
                      Download Original
                    </button>
                  )}
                </div>
              </div>

              <div className="slide-container">
                {selectedTrace.presentation ? (
                  <SlideEditor
                    presentation={selectedTrace.presentation}
                    onSave={handleSavePresentation}
                  />
                ) : selectedTrace.pptx_base64 ? (
                  <div className="no-embed">
                    <div className="icon">
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                        <polyline points="14,2 14,8 20,8" />
                        <rect x="8" y="12" width="8" height="6" rx="1" />
                      </svg>
                    </div>
                    <h3>PPTX Available</h3>
                    <p>Unable to parse this presentation for editing. Click below to download.</p>
                    <button onClick={() => downloadPptx(selectedTrace.pptx_base64!, `${selectedTrace.trace_name}.pptx`)}>
                      Download PPTX
                    </button>
                  </div>
                ) : (
                  <div className="no-embed error-state">
                    <h3>No Presentation Found</h3>
                    <p>{selectedTrace.error || 'This trace does not contain PPTX output.'}</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="no-selection">
              <p>Select a trace to view and edit its presentation</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
