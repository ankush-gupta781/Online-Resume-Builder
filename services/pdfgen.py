"""Server-side PDF generation with ReportLab (real, selectable text)."""
import io, base64, re
from xml.sax.saxutils import escape
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.platypus import BaseDocTemplate, PageTemplate, Frame, FrameBreak, NextPageTemplate, SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Table, TableStyle, PageBreak, Image, KeepTogether
from .util import lines

FONTS = {"serif": ("Times-Roman", "Times-Bold", "Times-Italic"), "sans": ("Helvetica", "Helvetica-Bold", "Helvetica-Oblique"),
         "mono": ("Courier", "Courier-Bold", "Courier-Oblique")}
# template: (centered header, heading caps, rule under heading, header band, use accent color)
TPL = {"classic": (1, 1, 1, 0, 0), "minimal": (0, 0, 0, 0, 1), "ats": (0, 1, 0, 0, 0), "student": (0, 1, 1, 0, 1),
       "technical": (0, 1, 1, 0, 1), "corporate": (0, 1, 1, 1, 1), "executive": (1, 1, 1, 0, 1), "accent": (0, 0, 1, 1, 1), "sidebar": (0, 1, 1, 0, 1)}
MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split()

def fd(s):
    m = re.match(r"^(\d{4})-(\d{2})$", s or "")
    return f"{MONTHS[int(m.group(2)) - 1]} {m.group(1)}" if m else (s or "")
def span(e): 
    a, b = fd(e.get("start")), fd(e.get("end")) or ("Present" if e.get("start") else "")
    return f"{a} – {b}" if a else b
def esc(s): return escape(str(s or ""))
def join(*p, sep=" | "): return sep.join(esc(x) for x in p if x)
def sortrev(items): return sorted(items, key=lambda e: (e.get("end") or "9999", e.get("start") or ""), reverse=True)

def build_pdf(d, appendix):
    des = d.get("design") or {}; tid = des.get("template", "classic"); tid = tid if tid in TPL else "classic"
    center, caps, rule, band, useacc = TPL[tid]
    reg, bold, ital = FONTS.get(des.get("font"), FONTS["serif" if tid in ("classic", "executive") else "sans"])
    try: acc = colors.HexColor(des.get("color") or "#3b4cca")
    except Exception: acc = colors.HexColor("#3b4cca")
    if not useacc: acc = colors.black
    two = des.get("layout") == "two"; sz = 9.5 if two else 10
    def S(n, **k):
        k.setdefault("fontName", reg); k.setdefault("fontSize", sz); k.setdefault("leading", k["fontSize"] * 1.3)
        return ParagraphStyle(n, **k)
    base, small = S("b"), S("s", textColor=colors.HexColor("#444444"), fontSize=sz - 1)
    name = S("n", fontName=bold, fontSize=22, leading=26, textColor=colors.white if band else acc, alignment=TA_CENTER if center else 0)
    contact = S("c", alignment=TA_CENTER if center else 0, textColor=colors.white if band else colors.HexColor("#333333"), fontSize=sz - 1)
    head = S("h", fontName=bold, fontSize=sz + 1.5, textColor=acc, spaceBefore=9, spaceAfter=2)
    row = S("r", fontName=bold); bul = S("bu", leftIndent=11, bulletIndent=1)
    p = d.get("personal") or {}; st = []
    CL = [("email", "Mail Id"), ("phone", "Mob No"), ("city", "City")]
    CL2 = [("linkedin", "LinkedIn"), ("github", "Git Hub"), ("portfolio", "Portfolio"), ("website", "Website")]
    cst = S("cst", textColor=colors.white if band else colors.HexColor("#333333"), fontSize=sz - .5)
    def cpar(keys): return [Paragraph(f"<b>{l} :</b> {esc(p[k])}", cst) for k, l in keys if p.get(k)]
    c1, c2 = cpar(CL), cpar(CL2)
    hdr = [Paragraph(esc(p.get("fullName") or "Your Name"), name)]
    if c1 or c2:
        ct = Table([[c1 or "", c2 or ""]], colWidths=[75 * mm, 75 * mm], hAlign="CENTER" if center else "LEFT")
        ct.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 6), ("TOPPADDING", (0, 0), (-1, -1), 1), ("BOTTOMPADDING", (0, 0), (-1, -1), 1), ("VALIGN", (0, 0), (-1, -1), "TOP")]))
        hdr += [Spacer(1, 4), ct]
    if band:
        t = Table([[hdr]], colWidths=[A4[0] - 30 * mm]); t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), acc), ("LEFTPADDING", (0, 0), (-1, -1), 10), ("TOPPADDING", (0, 0), (-1, -1), 10), ("BOTTOMPADDING", (0, 0), (-1, -1), 10)]))
        st.append(t)
    else: st += hdr

    def H(t):
        out = [Paragraph(esc(t.upper() if caps else t), head)]
        if rule: out.append(HRFlowable(width="100%", thickness=.6, color=acc, spaceAfter=3))
        return out
    def bullets(txt): return [Paragraph(esc(l), bul, bulletText="•") for l in lines(txt)]
    def entry(l, r, sub=None, extra=()):
        t = Table([[Paragraph(l, row), Paragraph(r, S("rr", alignment=2, fontSize=sz - 1))]], colWidths=[None, 38 * mm])
        t.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0), ("TOPPADDING", (0, 0), (-1, -1), 2), ("BOTTOMPADDING", (0, 0), (-1, -1), 0), ("VALIGN", (0, 0), (-1, -1), "TOP")]))
        out = [t]
        if sub: out.append(Paragraph(f"<i>{sub}</i>", small))
        for x in extra:
            if x: out += x
        return out

    sec = {}
    if d.get("summary") or d.get("objective"):
        sec["summary"] = H("Summary") + [Paragraph(esc(d.get("summary") or d.get("objective")), base)]
    for k, title, key in (("education", "Education", 0), ("experience", "Experience", 1), ("internships", "Internships", 1)):
        es = [e for e in d.get(k) or [] if any(v for v in e.values())]
        if not es: continue
        out = H(title)
        for e in (sortrev(es) if key else es):
            if k == "education":
                sub = join(e.get("institution"), e.get("location"), ("CGPA/%: " + e["gpa"]) if e.get("gpa") else "")
                ex = [bullets(e.get("achievements")), [Paragraph("Coursework: " + esc(e["coursework"]), small)] if e.get("coursework") else []]
                out += entry(join(e.get("degree"), e.get("major"), sep=", "), esc(span(e)), sub, ex)
            else:
                ex = [bullets(e.get("responsibilities")), bullets(e.get("achievements")), [Paragraph("Technologies: " + esc(e["technologies"]), small)] if e.get("technologies") else []]
                out += entry(esc(e.get("title")), esc(span(e)), join(e.get("company"), e.get("location")), ex)
        sec[k] = out
    sk = [(c, v) for c, v in (d.get("skills") or {}).items() if v and v.strip()]
    if sk:
        sec["skills"] = H("Skills") + [Paragraph(f"<b>{esc(c.capitalize())}:</b> {esc(v)}", base) for c, v in sk]
    es = [e for e in d.get("projects") or [] if e.get("name")]
    if es:
        out = H("Projects")
        for e in es:
            links = join(e.get("github"), e.get("live"))
            ex = [bullets(e.get("description")), bullets(e.get("features")), bullets(e.get("achievements")), [Paragraph("Technologies: " + esc(e["technologies"]), small)] if e.get("technologies") else []]
            out += entry(esc(e["name"]), esc(e.get("duration")), links or None, ex)
        sec["projects"] = out
    es = [e for e in d.get("certifications") or [] if e.get("name")]
    if es:
        sec["certifications"] = H("Certifications") + [Paragraph(join(e["name"], e.get("issuer"), fd(e.get("date")), ("ID: " + e["credentialId"]) if e.get("credentialId") else ""), base) for e in es]
    es = [e for e in d.get("achievements") or [] if e.get("title")]
    if es:
        out = H("Achievements")
        for e in es: out += entry(esc(e["title"]), esc(fd(e.get("date"))), esc(e.get("organization")) or None, [bullets(e.get("description"))])
        sec["achievements"] = out
    es = [e for e in d.get("volunteering") or [] if e.get("title")]
    if es:
        out = H("Volunteering")
        for e in es: out += entry(esc(e["title"]), esc(span(e)), esc(e.get("organization")) or None, [bullets(e.get("description"))])
        sec["volunteering"] = out
    es = [e for e in d.get("additional") or [] if e.get("title") and e.get("text")]
    if es:
        out = []
        for e in es: out += H(e["title"]) + bullets(e["text"])
        sec["additional"] = out
    order = [k for k in d.get("order") or [] if k in sec] + [k for k in sec if k not in (d.get("order") or [])]
    sidebar = tid == "sidebar"
    if sidebar:
        W = colors.white; SIDE = ("skills", "certifications", "additional")
        ws = S("ws", textColor=W, fontSize=sz - .5); wh = S("wh", fontName=bold, fontSize=sz + .5, textColor=W, spaceBefore=12, spaceAfter=3)
        st = [Paragraph(esc(p.get("fullName") or "Your Name"), S("wn", fontName=bold, fontSize=19, leading=22, textColor=W, spaceAfter=4))]
        st += [Paragraph("CONTACT", wh)] + [Paragraph(f"<b>{l} :</b> {esc(p[k])}", ws) for k, l in CL + CL2 if p.get(k)]
        if sk: st += [Paragraph("SKILLS", wh)] + [Paragraph(f"<b>{esc(c.capitalize())}:</b> {esc(v)}", ws) for c, v in sk]
        ce2 = [e for e in d.get("certifications") or [] if e.get("name")]
        if ce2: st.append(Paragraph("CERTIFICATIONS", wh))
        st += [Paragraph(join(e["name"], e.get("issuer"), fd(e.get("date")), sep=", "), ws) for e in ce2]
        for e in [e for e in d.get("additional") or [] if e.get("title") and e.get("text")]:
            st += [Paragraph(esc(e["title"].upper()), wh)] + [Paragraph(esc(l), ws) for l in lines(e["text"])]
        st += [NextPageTemplate("later"), FrameBreak()]
        for k in order:
            if k not in SIDE: st += sec[k]
    else:
        for k in order: st += sec[k]

    if appendix:
        st.append(PageBreak()); st += H("Certificates and Supporting Images")
        for a in appendix[:8]:
            st.append(Paragraph("<b>" + esc(a.get("name")) + "</b>", base))
            m = re.match(r"data:image/(png|jpeg|jpg);base64,(.+)", a.get("data") or "")
            if m:
                try:
                    im = Image(io.BytesIO(base64.b64decode(m.group(2)))); w, h = im.imageWidth, im.imageHeight
                    sc = min(150 * mm / w, 110 * mm / h, 1); im.drawWidth, im.drawHeight = w * sc, h * sc
                    st += [Spacer(1, 3), KeepTogether([im]), Spacer(1, 8)]
                except Exception: st.append(Paragraph("(image could not be embedded)", small))
            else: st.append(Paragraph("(PDF file kept by the applicant; available on request)", small))
    buf = io.BytesIO()
    meta = dict(title=(p.get("fullName") or "Resume") + " - Resume", author=p.get("fullName") or "")
    if sidebar:
        PW, PH = A4; SW = 190
        def bg(cv, _d): cv.setFillColor(acc); cv.rect(0, 0, SW, PH, fill=1, stroke=0)
        doc = BaseDocTemplate(buf, pagesize=A4, **meta)
        doc.addPageTemplates([PageTemplate("first", [Frame(0, 0, SW, PH, 16, 34, 14, 24), Frame(SW, 0, PW - SW, PH, 22, 34, 24, 24)], onPage=bg),
                              PageTemplate("later", [Frame(0, 0, PW, PH, 40, 34, 40, 34)])])
    else:
        doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=15 * mm, rightMargin=15 * mm, topMargin=14 * mm, bottomMargin=14 * mm, **meta)
    doc.build(st)
    return buf.getvalue()
