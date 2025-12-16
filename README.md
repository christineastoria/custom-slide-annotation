# Financial Slide Agent with Custom UI

A LangGraph agent that generates PowerPoint presentations from financial data, with a React frontend for viewing and editing slides via Google Slides.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  LangGraph      │────▶│  FastAPI        │────▶│  React          │
│  Agent          │     │  Backend        │     │  Frontend       │
│  (PPTX bytes)   │     │  (LangSmith +   │     │  (Google Slides │
│                 │     │   Google Drive) │     │   iframe)       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Quick Start

### 1. Run the Agent (generate presentations)

```bash
cd custom-ui-annotations
uv sync
uv run python financial_slide_agent.py
```

This creates PPTX files and logs traces to LangSmith.

### 2. Start the Backend

```bash
cd backend
pip install -r requirements.txt

# Set your LangSmith project name
export LANGSMITH_PROJECT="your-project-name"

# Optional: For Google Slides embedding, add service account credentials
# export GOOGLE_SERVICE_ACCOUNT_FILE="service-account.json"

python app.py
```

Backend runs on http://localhost:8000

### 3. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:5173

## Features

- **Agent Tools**: Granular PPTX creation tools (add_slide, add_metric_card, etc.)
- **LangSmith Integration**: Fetches recent traces with PPTX outputs
- **Google Slides Embed**: Edit presentations directly in the browser
- **Download Fallback**: Download PPTX if Google Drive not configured

## Google Drive Setup (Optional)

To enable Google Slides embedding:

1. Create a Google Cloud project
2. Enable the Google Drive API
3. Create a service account with Drive API access
4. Download the JSON credentials as `service-account.json`
5. Set the environment variable:
   ```bash
   export GOOGLE_SERVICE_ACCOUNT_FILE="path/to/service-account.json"
   ```

Without Google Drive credentials, the app will show a download button instead of the embedded editor.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `LANGSMITH_API_KEY` | LangSmith API key | Yes |
| `LANGSMITH_PROJECT` | LangSmith project name | Yes |
| `OPENAI_API_KEY` | OpenAI API key (for agent) | Yes |
| `GOOGLE_SERVICE_ACCOUNT_FILE` | Path to Google service account JSON | No |

## API Endpoints

- `GET /api/traces` - Fetch last 3 traces with PPTX outputs
- `GET /api/health` - Health check with service status
