# contributed by ankush gupta, ayush narvariya, nikunj goyal
# Online Resume Builder
Flask app: guided builder, 8 templates, live preview, ATS analyzer, document import (PDF text + OCR), GitHub import, PDF export (ReportLab), optional AI assistant.
Project by AYUSH NARVARIYA (BTAI26O1026), ANKUSH GUPTA (BTAI26O1013), NIKUNJ GOYAL (BTAI26O1079) - MITS-DU, Gwalior.

## Run locally
```
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env     # optional: add AI_API_KEY
python app.py            # http://localhost:5000
```
OCR for PNG/JPG needs the Tesseract binary (`sudo apt install tesseract-ocr`, or the Windows installer). Without it, image text extraction is skipped and you can type details manually.

## Enable the AI assistant
Get a free key from Google AI Studio, set `AI_API_KEY` (and optionally `AI_MODEL`) as an environment variable. Keys stay on the server. To add another provider, subclass `BaseProvider` in `services/ai.py` and register it in `PROVIDERS`, then set `AI_PROVIDER`.
Load `.env` yourself if running locally (`export $(cat .env | xargs)`), or set variables in your shell.

## Deploy on Render
1. `git init && git add . && git commit -m "init"`; create a GitHub repo and `git push` (`.env` is git-ignored).
2. Render dashboard > New > Web Service > connect the GitHub repo.
3. Build command: `pip install -r requirements.txt`  Start command: `gunicorn app:app`
4. Environment: add `AI_API_KEY` (and `SECRET_KEY`). `render.yaml` pre-fills the rest.
5. Deploy, open the `.onrender.com` URL, and test: create a resume, download the PDF, run ATS.
Note: Render's Python runtime has no Tesseract, so image OCR is unavailable there; PDF text extraction works. Free instances sleep when idle.

## Privacy
Resume data lives in the browser (localStorage). The server processes uploads and PDF requests in memory and stores nothing. AI calls send only the text you confirm.

# Online-Resume-Builder
Online Resume Builder using Python Flask, HTML and CSS – A collaborative 3-member team project.
   e660b78f4358bb63880c32bbf898eabb2f63cc45
