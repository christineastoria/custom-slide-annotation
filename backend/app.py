"""
Backend API for fetching LangSmith traces and serving presentations as PDF for annotation.
"""

from dotenv import load_dotenv
load_dotenv()

import os
import ast
import base64
import tempfile
import subprocess
from io import BytesIO
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from langsmith import Client


app = FastAPI(title="Slide Viewer API")

# CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize LangSmith client
ls_client = Client()

# Cache for converted PDFs (trace_id -> pdf_bytes)
pdf_cache: dict[str, bytes] = {}


# ============================================================================
# PPTX TO PDF CONVERSION
# ============================================================================

def convert_pptx_to_pdf(pptx_bytes: bytes) -> Optional[bytes]:
    """
    Convert PPTX to PDF using LibreOffice.
    Falls back to returning None if conversion fails.
    """
    try:
        # Create temporary files
        with tempfile.TemporaryDirectory() as tmpdir:
            pptx_path = Path(tmpdir) / "presentation.pptx"
            pdf_path = Path(tmpdir) / "presentation.pdf"
            
            # Write PPTX to temp file
            pptx_path.write_bytes(pptx_bytes)
            
            # Try to convert using LibreOffice
            # Common paths for LibreOffice
            libreoffice_cmds = [
                "soffice",  # Linux
                "libreoffice",  # Linux alternative
                "/Applications/LibreOffice.app/Contents/MacOS/soffice",  # macOS
            ]
            
            for cmd in libreoffice_cmds:
                try:
                    result = subprocess.run(
                        [
                            cmd,
                            "--headless",
                            "--convert-to",
                            "pdf",
                            "--outdir",
                            tmpdir,
                            str(pptx_path),
                        ],
                        capture_output=True,
                        timeout=30,
                        check=True,
                    )
                    
                    if pdf_path.exists():
                        print(f"Successfully converted PPTX to PDF using {cmd}")
                        return pdf_path.read_bytes()
                except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
                    continue
            
            print("LibreOffice not found or conversion failed")
            return None
            
    except Exception as e:
        print(f"Error converting PPTX to PDF: {e}")
        import traceback
        traceback.print_exc()
        return None


# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class TraceSlide(BaseModel):
    trace_id: str
    trace_name: str
    created_at: str
    pptx_base64: Optional[str] = None
    has_pdf: bool = False
    error: Optional[str] = None


class TracesResponse(BaseModel):
    traces: list[TraceSlide]


# ============================================================================
# API ENDPOINTS
# ============================================================================

def extract_pptx_from_trace(trace_id: str) -> Optional[bytes]:
    """Extract PPTX bytes from a trace's finalize_presentation tool call."""
    project_name = os.getenv("LANGSMITH_PROJECT", "default")
    try:
        runs = list(ls_client.list_runs(
            project_name=project_name,
            trace_id=trace_id,
        ))

        for run in runs:
            if run.name == "finalize_presentation" and run.outputs:
                output = run.outputs.get("output")
                if not output:
                    continue

                content = output.get("content")
                if not content:
                    continue

                # content is often like "b'...'"
                if isinstance(content, bytes):
                    return content

                if isinstance(content, str):
                    try:
                        pptx_bytes = ast.literal_eval(content)
                        if isinstance(pptx_bytes, (bytes, bytearray)):
                            print(f"Extracted {len(pptx_bytes)} bytes from trace")
                            return bytes(pptx_bytes)
                    except Exception:
                        # Sometimes it might already be base64 or not literal-evaluable
                        pass

        print(f"No finalize_presentation output found in trace {trace_id}")
        return None

    except Exception as e:
        print(f"Error extracting PPTX from trace {trace_id}: {e}")
        import traceback
        traceback.print_exc()
        return None


@app.get("/api/traces", response_model=TracesResponse)
async def get_recent_traces():
    """Get the last 3 traces with their PPTX outputs."""
    project_name = os.getenv("LANGSMITH_PROJECT", "default")

    try:
        root_runs = list(ls_client.list_runs(
            project_name=project_name,
            is_root=True,
            limit=3,
        ))

        result_traces: list[TraceSlide] = []
        for run in root_runs:
            trace_id = str(run.trace_id)
            trace_slide = TraceSlide(
                trace_id=trace_id,
                trace_name=run.name or "Unnamed",
                created_at=run.start_time.isoformat() if run.start_time else "",
            )

            pptx_bytes = extract_pptx_from_trace(trace_id)
            if pptx_bytes:
                trace_slide.pptx_base64 = base64.b64encode(pptx_bytes).decode()
                
                # Try to convert to PDF and cache it
                pdf_bytes = convert_pptx_to_pdf(pptx_bytes)
                if pdf_bytes:
                    pdf_cache[trace_id] = pdf_bytes
                    trace_slide.has_pdf = True
                else:
                    trace_slide.has_pdf = False
            else:
                trace_slide.error = "No PPTX output found in trace"

            result_traces.append(trace_slide)

        return TracesResponse(traces=result_traces)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/traces/{trace_id}/slides.pdf")
async def get_trace_pdf(trace_id: str):
    """Get PDF version of a trace's presentation."""
    # Check cache first
    if trace_id in pdf_cache:
        return Response(
            content=pdf_cache[trace_id],
            media_type="application/pdf",
            headers={"Content-Disposition": f"inline; filename=slides-{trace_id}.pdf"}
        )
    
    # Not in cache, try to extract and convert
    pptx_bytes = extract_pptx_from_trace(trace_id)
    if not pptx_bytes:
        raise HTTPException(status_code=404, detail="PPTX not found for this trace")
    
    pdf_bytes = convert_pptx_to_pdf(pptx_bytes)
    if not pdf_bytes:
        raise HTTPException(status_code=500, detail="Failed to convert PPTX to PDF")
    
    # Cache for future requests
    pdf_cache[trace_id] = pdf_bytes
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=slides-{trace_id}.pdf"}
    )


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "langsmith_project": os.getenv("LANGSMITH_PROJECT", "default")
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
