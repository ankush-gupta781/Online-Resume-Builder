import re
VERBS = set("achieved analyzed automated built collaborated created delivered designed developed implemented improved increased led managed optimized reduced launched deployed engineered established organized coordinated researched resolved streamlined trained mentored integrated tested migrated authored presented secured generated drove executed maintained".split())
def lines(s): return [x.strip(" -•*\t") for x in (s or "").splitlines() if x.strip(" -•*\t")]
def resume_text(d):
    parts = [d.get("summary", ""), d.get("objective", "")]
    for k in ("education", "experience", "internships", "projects", "certifications", "achievements", "volunteering", "additional"):
        for e in d.get(k) or []: parts += [str(v) for v in e.values() if isinstance(v, str)]
    parts += [v for v in (d.get("skills") or {}).values() if isinstance(v, str)]
    return "\n".join(parts)
def skill_list(d):
    out = []
    for v in (d.get("skills") or {}).values():
        out += [s.strip() for s in re.split(r"[,;\n]", v or "") if s.strip()]
    return out
def words(s): return re.findall(r"[a-zA-Z][a-zA-Z+#.\-]{1,}", s.lower())
