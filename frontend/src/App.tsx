import { useState, useEffect } from "react";
import "./App.css";
import SlidePdfViewer from "./SlidePdfViewer";

interface TraceSlide {
  trace_id: string;
  trace_name: string;
  created_at: string;
  pptx_base64?: string;
  has_pdf: boolean;
  error?: string;
}

interface TracesResponse {
  traces: TraceSlide[];
}

function App() {
  const [traces, setTraces] = useState<TraceSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrace, setSelectedTrace] = useState<TraceSlide | null>(null);

  useEffect(() => {
    fetchTraces();
  }, []);

  const fetchTraces = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/traces");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data: TracesResponse = await response.json();
      setTraces(data.traces);
      if (data.traces.length > 0) {
        setSelectedTrace(data.traces[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch traces");
    } finally {
      setLoading(false);
    }
  };

  const downloadPptx = (pptxBase64: string, filename: string) => {
    const bytes = atob(pptxBase64);
    const arrayBuffer = new ArrayBuffer(bytes.length);
    const uint8Array = new Uint8Array(arrayBuffer);
    for (let i = 0; i < bytes.length; i++) {
      uint8Array[i] = bytes.charCodeAt(i);
    }

    const blob = new Blob([uint8Array], {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="app">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading traces from LangSmith...</p>
        </div>
      </div>
    );
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
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Slide Viewer</h1>
        <p className="subtitle">View AI-generated presentations as real slides</p>
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
                className={`trace-item ${
                  selectedTrace?.trace_id === trace.trace_id ? "selected" : ""
                }`}
                onClick={() => setSelectedTrace(trace)}
              >
                <div className="trace-name">{trace.trace_name}</div>
                <div className="trace-date">{formatDate(trace.created_at)}</div>
                <div className="trace-status">
                  {trace.has_pdf && (
                    <span className="status-badge success">PDF</span>
                  )}
                  {trace.pptx_base64 && !trace.has_pdf && (
                    <span className="status-badge warning">PPTX Only</span>
                  )}
                  {!trace.pptx_base64 && trace.error && (
                    <span className="status-badge error">No PPTX</span>
                  )}
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
                    <button
                      onClick={() =>
                        downloadPptx(
                          selectedTrace.pptx_base64!,
                          `${selectedTrace.trace_name}.pptx`
                        )
                      }
                    >
                      Download PPTX
                    </button>
                  )}
                </div>
              </div>

              <div className="slide-container">
                {selectedTrace.has_pdf ? (
                  <SlidePdfViewer
                    pdfUrl={`/api/traces/${selectedTrace.trace_id}/slides.pdf`}
                  />
                ) : selectedTrace.pptx_base64 ? (
                  <div className="no-embed error-state">
                    <h3>PDF Conversion Not Available</h3>
                    <p>
                      LibreOffice is not installed. Install LibreOffice to view slides as PDF.
                    </p>
                    <p style={{ marginTop: "1rem", fontSize: "0.9rem", opacity: 0.8 }}>
                      You can still download the PPTX file using the button above.
                    </p>
                  </div>
                ) : (
                  <div className="no-embed error-state">
                    <h3>No Presentation Found</h3>
                    <p>
                      {selectedTrace.error ||
                        "This trace does not contain PPTX output."}
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="no-selection">
              <p>Select a trace to view its presentation</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
