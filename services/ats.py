from .util import lines, resume_text, skill_list, VERBS, words
import re
VOCAB = "python java javascript typescript c++ c# sql mysql postgresql mongodb html css react angular flask django docker kubernetes aws azure gcp git linux rest api tensorflow pytorch pandas numpy excel agile scrum testing communication leadership teamwork figma android kotlin php devops cloud security machine learning deep learning data analysis".split()
def jd_gaps(d, jd):
    low, txt = jd.lower(), resume_text(d).lower()
    f = lambda w, s: re.search(r"(?<![\w+#.])" + re.escape(w) + r"(?![\w+#])", s)
    return [w for w in VOCAB if f(w, low) and not f(w, txt)]

def analyze_ats(d):
    p = d.get("personal") or {}
    cats, good, bad, tips, fmt = {}, [], [], [], []
    def cat(name, got, mx): cats[name] = {"score": max(0, min(mx, round(got))), "max": mx}

    c = sum(3 for k in ("fullName", "email", "phone", "city") if p.get(k)) + (3 if p.get("linkedin") or p.get("github") else 0)
    if not p.get("email"): bad.append("Email is missing."); tips.append("Add a professional email address.")
    if not p.get("phone"): tips.append("Add a phone number.")
    if c >= 12: good.append("Contact details are complete.")
    cat("Contact information", c, 15)

    sk = skill_list(d)
    have = {"summary": bool(d.get("summary", "").strip()), "education": bool(d.get("education")),
            "experience": bool(d.get("experience") or d.get("internships")), "skills": bool(sk),
            "projects": bool(d.get("projects")), "certifications": bool(d.get("certifications")), "achievements": bool(d.get("achievements"))}
    missing = [k for k in ("summary", "education", "experience", "skills") if not have[k]]
    cat("Resume sections", sum(have.values()) * 15 / 7 + 0.4, 15)
    for m in missing: bad.append(f"Missing section: {m}."); tips.append(f"Add a {m} section.")

    n = len(d.get("summary", "").split())
    cat("Summary", 0 if not n else (10 if 30 <= n <= 90 else 6), 10)
    if not n: tips.append("Add a 2-4 sentence professional summary.")
    elif n < 30: tips.append("Your summary is short; aim for 30-90 words.")
    elif n > 90: tips.append("Your summary is long; trim it to under 90 words.")
    else: good.append("Summary length is appropriate.")

    cat("Skills", len(sk) * 1.5, 15)
    if len(sk) >= 8: good.append(f"{len(sk)} skills listed.")
    else: bad.append("Few skills listed."); tips.append("List at least 8 relevant skills, grouped by category.")

    ed = d.get("education") or []
    cat("Education", 10 if ed and all(e.get("degree") and e.get("institution") for e in ed) else (5 if ed else 0), 10)
    if not ed: bad.append("No education entered.")

    bl = [b for k in ("experience", "internships", "projects") for e in d.get(k) or []
          for b in lines(e.get("responsibilities") or e.get("description") or "") + lines(e.get("achievements"))]
    if bl:
        verbs = sum(1 for b in bl if words(b)[:1] and words(b)[0] in VERBS)
        quant = sum(1 for b in bl if re.search(r"\d", b))
        long_ = sum(1 for b in bl if len(b.split()) > 35)
        cat("Experience & bullet quality", 6 + 7 * verbs / len(bl) + 7 * min(1, quant / max(1, len(bl) * .4)) - min(3, long_), 20)
        if verbs / len(bl) < .6: bad.append("Many bullets don't start with an action verb."); tips.append("Start bullets with verbs like Built, Led, Reduced, Implemented.")
        else: good.append("Bullets use strong action verbs.")
        if quant / len(bl) < .3: bad.append("Few quantified achievements."); tips.append("Add real numbers (users, %, time saved) where true.")
        else: good.append("Achievements include measurable results.")
        if long_: tips.append(f"{long_} bullet(s) are very long; keep them under ~30 words.")
    else:
        cat("Experience & bullet quality", 0, 20); bad.append("No experience, internship or project bullets found."); tips.append("Add responsibilities or project details as short bullets.")

    tw = len(resume_text(d).split())
    techs = sum(1 for k in ("experience", "projects", "internships") for e in d.get(k) or [] if e.get("technologies"))
    cat("Keywords", min(6, len(sk) * .6) + min(4, techs * 2), 10)

    des = d.get("design") or {}; tpl = des.get("template", "classic"); f = 10
    if (des.get("layout") == "two" or tpl == "sidebar") and tpl != "ats": f -= 3; fmt.append("Two-column layouts may confuse some ATS parsers. Use single column for applications.")
    if tpl not in ("ats", "classic", "minimal", "student"): f -= 1; fmt.append("Decorative templates are riskier for ATS; 'ATS Optimized' is the safest.")
    if tw > 900: f -= 3; fmt.append("Resume text is long; target 1-2 pages.")
    if tw < 120: f -= 3; fmt.append("Resume has very little content.")
    cat("Formatting & readability", f, 10)

    kws = []
    jd = (d.get("target") or {}).get("jd")
    if jd:
        kws = jd_gaps(d, jd)[:10]
    return {"score": sum(c["score"] for c in cats.values()), "categories": cats, "strengths": good, "weaknesses": bad,
            "missing_sections": missing, "suggestions": tips, "formatting": fmt, "keyword_recommendations": kws,
            "disclaimer": "This score is a heuristic estimate of ATS-friendliness. It does not guarantee any ATS outcome."}
