import io, re, subprocess, tempfile, os

MAGIC = {"pdf": b"%PDF", "png": b"\x89PNG", "jpg": b"\xff\xd8\xff"}
def validate_upload(name, raw):
    ext = (name or "").rsplit(".", 1)[-1].lower()
    ext = "jpg" if ext == "jpeg" else ext
    if ext not in MAGIC: return None, "Unsupported file type. Use PDF, PNG, JPG or JPEG."
    if not raw: return None, "The file is empty."
    if not raw.startswith(MAGIC[ext]): return None, "File content does not match its extension."
    return ext, None

def extract_text(kind, raw):
    if kind == "pdf":
        try:
            from pypdf import PdfReader
            t = "\n".join((p.extract_text() or "") for p in PdfReader(io.BytesIO(raw)).pages)
            return (t, "pdf-text") if t.strip() else ("", "scanned-pdf")
        except Exception:
            return "", "pdf-unreadable"
    with tempfile.NamedTemporaryFile(suffix="." + kind, delete=False) as f:
        f.write(raw); path = f.name
    try:
        out = subprocess.run(["tesseract", path, "stdout"], capture_output=True, text=True, timeout=40)
        return out.stdout, "ocr"
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return "", "ocr-unavailable"
    finally:
        os.unlink(path)

def suggest_section(text):
    low = text.lower()
    if re.search(r"certif|completion|completed|credential", low): sec = "certifications"
    elif re.search(r"award|winner|rank|prize|hackathon|scholarship|merit|achiev", low): sec = "achievements"
    elif re.search(r"github\.com|project", low): sec = "projects"
    else: sec = "achievements"
    ls = [l.strip() for l in text.splitlines() if len(l.strip()) > 3]
    date = re.search(r"((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.? \d{1,2},? \d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})", text, re.I)
    cid = re.search(r"(?:credential|certificate|id|no)[\s.#:]*([A-Z0-9\-]{6,})", text, re.I)
    url = re.search(r"https?://\S+", text)
    iss = re.search(r"(?:issued by|offered by|by|from)\s+([A-Z][\w &.\-]{2,40}?)(?:\s+on\s|\s+dated|\n|$)", text)
    return {"section": sec, "name": ls[0][:100] if ls else "", "issuer": iss.group(1).strip() if iss else "",
            "date": date.group(1) if date else "", "credentialId": cid.group(1) if cid else "", "url": url.group(0) if url else ""}
