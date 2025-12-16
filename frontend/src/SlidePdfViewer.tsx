import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";

/**
 * IMPORTANT for Vite / modern bundlers:
 * pdf.js needs its worker set explicitly.
 */
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

interface SlidePdfViewerProps {
  pdfUrl: string;
}

/**
 * Renders a multi-page PDF as "slides" with navigation controls.
 */
export default function SlidePdfViewer({ pdfUrl }: SlidePdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  // Reset to page 1 when PDF URL changes (new presentation selected)
  useEffect(() => {
    setCurrentPage(1);
  }, [pdfUrl]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        setCurrentPage((prev) => Math.max(1, prev - 1));
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        setCurrentPage((prev) => Math.min(numPages, prev + 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [numPages]);

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#0f172a",
      }}
    >
      {/* Navigation Controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          padding: "16px 24px",
          background: "rgba(0, 0, 0, 0.3)",
          borderBottom: "1px solid rgba(99, 102, 241, 0.2)",
        }}
      >
        <button
          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
          style={{
            padding: "10px 20px",
            background: "rgba(30, 30, 46, 0.8)",
            color: "#f4f4f5",
            border: "1px solid rgba(99, 102, 241, 0.2)",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: 500,
            fontSize: "14px",
            opacity: currentPage === 1 ? 0.4 : 1,
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            if (currentPage !== 1) {
              e.currentTarget.style.background = "rgba(45, 45, 65, 0.9)";
              e.currentTarget.style.borderColor = "#6366f1";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(30, 30, 46, 0.8)";
            e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.2)";
          }}
        >
          ← Previous
        </button>

        <div
          style={{
            padding: "10px 24px",
            background: "rgba(99, 102, 241, 0.15)",
            border: "1px solid rgba(99, 102, 241, 0.3)",
            borderRadius: "8px",
            color: "#f4f4f5",
            fontSize: "14px",
            fontWeight: 600,
            minWidth: "140px",
            textAlign: "center",
          }}
        >
          Slide {currentPage} of {numPages || "..."}
        </div>

        <button
          onClick={() => setCurrentPage((prev) => Math.min(numPages, prev + 1))}
          disabled={currentPage === numPages}
          style={{
            padding: "10px 20px",
            background: "rgba(30, 30, 46, 0.8)",
            color: "#f4f4f5",
            border: "1px solid rgba(99, 102, 241, 0.2)",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: 500,
            fontSize: "14px",
            opacity: currentPage === numPages ? 0.4 : 1,
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            if (currentPage !== numPages) {
              e.currentTarget.style.background = "rgba(45, 45, 65, 0.9)";
              e.currentTarget.style.borderColor = "#6366f1";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(30, 30, 46, 0.8)";
            e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.2)";
          }}
        >
          Next →
        </button>
      </div>

      {/* Slide Display */}
      <div
        ref={(el) => {
          if (el && containerWidth === 0) {
            setContainerWidth(el.clientWidth - 48);
          }
        }}
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          overflow: "auto",
          background: "#0f172a",
        }}
      >
        <div
          style={{
            transition: "opacity 0.15s ease-in-out",
            background: "#0f172a",
          }}
        >
          <Document
            file={pdfUrl}
            onLoadSuccess={(doc) => setNumPages(doc.numPages)}
            loading={
              <div style={{ color: "#fff", padding: 12 }}>Loading slides…</div>
            }
            error={
              <div style={{ color: "#fff", padding: 12 }}>Failed to load PDF</div>
            }
          >
            <Page
              pageNumber={currentPage}
              width={containerWidth > 0 ? Math.min(containerWidth, 1200) : undefined}
              renderAnnotationLayer={false}
              renderTextLayer={false}
              loading={
                <div
                  style={{
                    width: containerWidth > 0 ? Math.min(containerWidth, 1200) : 800,
                    height: containerWidth > 0 ? Math.min(containerWidth, 1200) * 0.5625 : 450,
                    background: "#0f172a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#666",
                  }}
                >
                  Loading slide...
                </div>
              }
              canvasBackground="#0f172a"
            />
          </Document>
        </div>
      </div>

      {/* Keyboard Hint */}
      <div
        style={{
          padding: "8px 24px",
          textAlign: "center",
          color: "#666",
          fontSize: "12px",
          background: "rgba(0, 0, 0, 0.2)",
          borderTop: "1px solid rgba(99, 102, 241, 0.1)",
        }}
      >
        Use arrow keys to navigate
      </div>
    </div>
  );
}
