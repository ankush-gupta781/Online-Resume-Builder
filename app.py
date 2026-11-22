"""Online Resume Builder - Flask app entry point."""
import io, os, requests
from flask import Flask, render_template, request, jsonify, send_file
from services.ai import get_provider
from services.ats import analyze_ats
from services.extract import validate_upload, extract_text, suggest_section
from services.pdfgen import build_pdf

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 25 * 1024 * 1024
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-only-change-me")

PAGES = {"/": "home", "/builder": "builder", "/ats": "ats", "/dashboard": "dashboard"}

def _page(name):
    return lambda: render_template(f"{name}.html", active=name)
for path, name in PAGES.items():
    app.add_url_rule(path, "page_" + name, _page(name))

def ok(**kw): return jsonify(ok=True, **kw)
def err(msg, code=400): return jsonify(ok=False, error=msg), code

@app.get("/api/status")
def status():
    return ok(ai=get_provider().configured)

@app.post("/api/ai")
def ai():
    body = request.get_json(silent=True) or {}
    p = get_provider()
    if not p.configured:
        return jsonify(ok=False, error="AI Resume Assistant is not configured on this server. All other features still work.", code="not_configured")
    try:
        return ok(text=p.run(body.get("action", ""), body.get("text", ""), body.get("job", ""), body.get("context", "")))
    except Exception as e:  # network/quota/etc: never crash
        return jsonify(ok=False, error=f"AI request failed: {str(e)[:160]}", code="failed")

@app.post("/api/ats")
def api_ats():
    d = request.get_json(silent=True) or {}
    return ok(result=analyze_ats(d))

@app.post("/api/extract")
def extract():
    f = request.files.get("file")
    if not f: return err("No file received.")
    raw = f.read()
    if len(raw) > 6 * 1024 * 1024: return err("File is larger than 6 MB.")
    kind, problem = validate_upload(f.filename, raw)
    if problem: return err(problem)
    text, method = extract_text(kind, raw)
    if not text.strip():
        return ok(text="", method=method, suggestion=None,
                  message="No readable text found. You can enter the details manually.")
    return ok(text=text[:20000], method=method, suggestion=suggest_section(text))

@app.get("/api/github/<user>")
def github(user):
    if not user.replace("-", "").isalnum() or len(user) > 39: return err("Invalid GitHub username.")
    try:
        r = requests.get(f"https://api.github.com/users/{user}/repos?per_page=50&sort=updated",
                         headers={"Accept": "application/vnd.github+json"}, timeout=10)
    except requests.RequestException:
        return err("Could not reach GitHub. Add projects manually.", 502)
    if r.status_code == 404: return err("GitHub user not found.", 404)
    if r.status_code != 200: return err("GitHub API unavailable or rate-limited. Try later.", 502)
    repos = [{"name": x["name"], "description": x.get("description") or "", "language": x.get("language") or "",
              "url": x["html_url"], "topics": x.get("topics", []), "stars": x["stargazers_count"]}
             for x in r.json() if not x.get("fork")]
    return ok(repos=repos)

@app.post("/api/pdf")
def pdf():
    b = request.get_json(silent=True) or {}
    try:
        data = build_pdf(b.get("resume") or {}, b.get("appendix") or [])
    except Exception as e:
        return err(f"PDF generation failed: {str(e)[:120]}", 500)
    return send_file(io.BytesIO(data), mimetype="application/pdf", as_attachment=True, download_name="resume.pdf")

@app.errorhandler(413)
def too_big(_): return err("File too large.", 413)
@app.errorhandler(404)
def nf(_): return render_template("home.html", active="home"), 404
@app.errorhandler(500)
def e500(_): return err("Unexpected server error.", 500)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5000)), debug=os.getenv("FLASK_DEBUG") == "1")
