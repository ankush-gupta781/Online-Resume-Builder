/* Shared state, storage, toast and resume renderer */
const RB = {
  KEY: "rb_resume", VKEY: "rb_versions",
  empty() { return { personal: {}, summary: "", objective: "", education: [], experience: [], internships: [],
    skills: { programming: "", tools: "", frameworks: "", databases: "", technical: "", soft: "" }, projects: [], certifications: [],
    achievements: [], volunteering: [], additional: [], target: { title: "", jd: "" },
    design: { template: "classic", font: "serif", color: "#3b4cca", layout: "one" },
    order: ["summary", "education", "experience", "internships", "skills", "projects", "certifications", "achievements", "volunteering", "additional"],
    scores: {} }; },
  load() { try { const s = JSON.parse(localStorage.getItem(this.KEY)); return Object.assign(this.empty(), s || {}); } catch (e) { return this.empty(); } },
  save(d) { try { localStorage.setItem(this.KEY, JSON.stringify(d)); return true; } catch (e) { toast("Browser storage is unavailable or full."); return false; } },
  versions() { try { return JSON.parse(localStorage.getItem(this.VKEY)) || []; } catch (e) { return []; } },
  saveVersions(v) { try { localStorage.setItem(this.VKEY, JSON.stringify(v)); } catch (e) { toast("Could not save version."); } },
  files: (() => { try { return JSON.parse(localStorage.getItem("rb_files")) || []; } catch (e) { return []; } })(), // uploaded images shown in the resume
  saveFiles() { try { localStorage.setItem("rb_files", JSON.stringify(this.files)); return true; } catch (e) { toast("Image storage is full. Delete an image and try again."); return false; } },
};
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
function toast(m) { const t = document.createElement("div"); t.className = "toast"; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2800); }
async function api(path, body, opts = {}) {
  try { const r = await fetch(path, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : opts);
    return await r.json(); } catch (e) { return { ok: false, error: "Network error. Is the server running?" }; }
}
const MON = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
const fdate = s => { const m = /^(\d{4})-(\d{2})$/.exec(s || ""); return m ? MON[+m[2] - 1] + " " + m[1] : (s || ""); };
const span = e => { const a = fdate(e.start), b = fdate(e.end) || (e.start ? "Present" : ""); return a ? a + " – " + b : b; };
const lines = s => (s || "").split("\n").map(x => x.replace(/^[\s\-•*]+/, "").trim()).filter(Boolean);
const bl = s => lines(s).length ? "<ul>" + lines(s).map(l => "<li>" + esc(l) + "</li>").join("") + "</ul>" : "";
const sortRev = a => [...a].sort((x, y) => ((y.end || "9999") + (y.start || "")).localeCompare((x.end || "9999") + (x.start || "")));
const row = (l, r, sub, extra = "") => `<div class="row"><b>${l}</b><span>${esc(r)}</span></div>${sub ? `<div class="sub">${sub}</div>` : ""}${extra}`;
const j = (...a) => a.filter(Boolean).map(esc).join(" | ");

function renderResume(d, opts = {}) {
  const des = d.design || {}, tid = des.template || "classic", p = d.personal || {};
  const two = des.layout === "two" && tid !== "ats";
  const contact = ["email", "phone", "city", "linkedin", "github", "portfolio", "website"].map(k => p[k]).filter(Boolean);
  const CL = [["email", "Mail Id"], ["phone", "Mob No"], ["city", "City"]], CL2 = [["linkedin", "LinkedIn"], ["github", "Git Hub"], ["portfolio", "Portfolio"], ["website", "Website"]];
  const col = a => a.filter(([k]) => p[k]).map(([k, l]) => `<div><b>${l} :</b> ${esc(p[k])}</div>`).join("");
  const ctv = (col(CL) || col(CL2)) ? `<div class="ctv"><div>${col(CL)}</div><div>${col(CL2)}</div></div>` : "";
  const imgs = opts.images && RB.files.length ? `<h2>Certificates and Supporting Images</h2><div class="imgs">${RB.files.map(f => `<figure><img src="${esc(f.data)}" alt=""><figcaption>${esc(String(f.name).replace(/\.\w+$/, ""))}</figcaption></figure>`).join("")}</div>` : "";
  const S = {};
  if (d.summary || d.objective) S.summary = `<h2>Summary</h2><p>${esc(d.summary || d.objective)}</p>`;
  const ed = (d.education || []).filter(e => e.degree || e.institution);
  if (ed.length) S.education = "<h2>Education</h2>" + ed.map(e => row(esc([e.degree, e.major].filter(Boolean).join(", ")), span(e), j(e.institution, e.location, e.gpa && "CGPA/%: " + e.gpa),
    bl(e.achievements) + (e.coursework ? `<p class="sub">Coursework: ${esc(e.coursework)}</p>` : ""))).join("");
  for (const [k, t] of [["experience", "Experience"], ["internships", "Internships"]]) {
    const xs = (d[k] || []).filter(e => e.title || e.company);
    if (xs.length) S[k] = `<h2>${t}</h2>` + sortRev(xs).map(e => row(esc(e.title), span(e), j(e.company, e.location),
      bl(e.responsibilities) + bl(e.achievements) + (e.technologies ? `<p class="sub">Technologies: ${esc(e.technologies)}</p>` : ""))).join("");
  }
  const sk = Object.entries(d.skills || {}).filter(([, v]) => v && v.trim());
  if (sk.length) S.skills = "<h2>Skills</h2>" + sk.map(([c, v]) => `<p><b>${esc(c[0].toUpperCase() + c.slice(1))}:</b> ${esc(v)}</p>`).join("");
  const pr = (d.projects || []).filter(e => e.name);
  if (pr.length) S.projects = "<h2>Projects</h2>" + pr.map(e => row(esc(e.name), e.duration, j(e.github, e.live),
    bl(e.description) + bl(e.features) + bl(e.achievements) + (e.technologies ? `<p class="sub">Technologies: ${esc(e.technologies)}</p>` : ""))).join("");
  const ce = (d.certifications || []).filter(e => e.name);
  if (ce.length) S.certifications = "<h2>Certifications</h2>" + ce.map(e => `<p>${j(e.name, e.issuer, fdate(e.date), e.credentialId && "ID: " + e.credentialId)}</p>`).join("");
  const ac = (d.achievements || []).filter(e => e.title);
  if (ac.length) S.achievements = "<h2>Achievements</h2>" + ac.map(e => row(esc(e.title), fdate(e.date), esc(e.organization || ""), bl(e.description))).join("");
  const vo = (d.volunteering || []).filter(e => e.title);
  if (vo.length) S.volunteering = "<h2>Volunteering</h2>" + vo.map(e => row(esc(e.title), span(e), esc(e.organization || ""), bl(e.description))).join("");
  const ad = (d.additional || []).filter(e => e.title && e.text);
  if (ad.length) S.additional = ad.map(e => `<h2>${esc(e.title)}</h2>${bl(e.text)}`).join("");
  const order = (d.order || []).filter(k => S[k]).concat(Object.keys(S).filter(k => !(d.order || []).includes(k)));
  const side = ["skills", "education", "certifications", "additional"];
  if (tid === "sidebar") {
    const sk2 = ["skills", "certifications", "additional"];
    return `<div class="page t-sidebar f-${esc(des.font || "sans")}" style="--a:${/^#[0-9a-f]{6}$/i.test(des.color) ? des.color : "#3f4ee0"}"><aside class="sd"><h1>${esc(p.fullName || "Your Name")}</h1><h2>Contact</h2><div class="ct">${CL.concat(CL2).filter(([k]) => p[k]).map(([k, l]) => `<span><b>${l} :</b> ${esc(p[k])}</span>`).join("")}</div>${order.filter(k => sk2.includes(k)).map(k => S[k]).join("")}</aside><div class="mn">${order.filter(k => !sk2.includes(k)).map(k => S[k]).join("") || '<p class="sub">Your experience, projects and education appear here.</p>'}${imgs}</div></div>`;
  }
  let body;
  if (two) body = `<div class="cols"><aside>${order.filter(k => side.includes(k)).map(k => S[k]).join("")}</aside><div>${order.filter(k => !side.includes(k)).map(k => S[k]).join("")}</div></div>`;
  else body = order.map(k => S[k]).join("");
  const empty = !p.fullName && !order.length ? `<p class="sub" style="margin-top:30px">Start filling the form and your resume appears here. Empty sections are hidden automatically.</p>` : "";
  return `<div class="page t-${esc(tid)} f-${esc(des.font || "serif")} ${two ? "two" : ""}" style="--a:${/^#[0-9a-f]{6}$/i.test(des.color) ? des.color : "#3b4cca"}"><header><h1>${esc(p.fullName || "Your Name")}</h1>${ctv}</header>${body}${imgs}${empty}${opts.nobreak ? "" : '<div class="pb">page 1 ends here</div>'}</div>`;
}
function fitStage(stage, scaleMax = 1) { // scale a 794px page to its container
  const pg = $(".page", stage); if (!pg) return;
  const s = Math.min(scaleMax, (stage.clientWidth - 28) / 794); pg.style.transform = `scale(${s})`;
  stage.style.height = (Math.max(pg.scrollHeight, 1123) * s + 28) + "px";
}
const TPLS = [["classic", "Classic Professional"], ["minimal", "Modern Minimalist"], ["ats", "ATS Optimized"], ["student", "Student / Fresher"],
  ["technical", "Technical Resume"], ["corporate", "Corporate Professional"], ["executive", "Elegant Executive"], ["accent", "Modern Accent"], ["sidebar", "Modern Sidebar"]];
const TMETA = { classic: ["Single column, serif, centered header.", ["Classic", "ATS-friendly"]], minimal: ["Light, airy, lots of white space.", ["Modern", "ATS-friendly"]],
  ats: ["Plain single column, safest for ATS.", ["ATS-friendly"]], student: ["Education first, clean headings.", ["Classic", "ATS-friendly"]],
  technical: ["Monospace headings for developers.", ["Modern"]], corporate: ["Colour header band, structured.", ["Modern"]],
  executive: ["Centered, refined, spaced caps.", ["Classic"]], accent: ["Colour band with accent rules.", ["Creative"]], sidebar: ["Coloured sidebar for contact and skills.", ["Creative"]] };
const DEMO = { personal: { fullName: "Nikunj Goyal", email: "nikunj@email.com", phone: "+91 98000 00000", city: "Gwalior, MP", github: "github.com/nikunj", linkedin: "linkedin.com/in/nikunj" },
  summary: "Final-year AI student who builds practical web apps and enjoys turning messy data into clear answers.",
  education: [{ degree: "B.Tech", major: "Artificial Intelligence", institution: "MITS-DU", start: "2022-07", end: "2026-06", gpa: "8.6" }],
  experience: [{ title: "Web Development Intern", company: "Example Tech", start: "2025-06", end: "2025-08", responsibilities: "Built 6 responsive pages that cut load time by 30%\nWorked with 4 engineers using Git and code reviews", technologies: "JavaScript, Git" }],
  projects: [{ name: "Campus Helper", duration: "2025", description: "Built a Flask app used by 300 students\nAdded search and notifications", technologies: "Python, Flask" }],
  skills: { programming: "Python, SQL, JavaScript", tools: "Git, Docker", soft: "Teamwork, Communication" }, certifications: [{ name: "Machine Learning Specialization", issuer: "Coursera", date: "2025-03" }],
  achievements: [{ title: "Winner, college hackathon", organization: "MITS-DU", date: "2025-02" }], order: ["summary", "experience", "education", "projects", "skills", "certifications", "achievements"] };
const hasData = d => !!((d.personal && d.personal.fullName) || d.summary || ["education", "experience", "internships", "projects", "certifications", "achievements", "volunteering", "additional"].some(k => (d[k] || []).length) || Object.values(d.skills || {}).some(v => v));
async function downloadPdf(d, btn) {
  const old = btn && btn.innerHTML; if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Generating…'; }
  try {
    const r = await fetch("/api/pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resume: d, appendix: RB.files.map(f => ({ name: f.name, data: f.data })) }) });
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || "PDF failed"); }
    const a = document.createElement("a"); a.href = URL.createObjectURL(await r.blob()); a.download = ((d.personal.fullName || "resume").replace(/\W+/g, "_")) + "_resume.pdf"; a.click(); toast("PDF downloaded");
  } catch (e) { toast(e.message || "PDF failed"); }
  if (btn) { btn.disabled = false; btn.innerHTML = old; }
}

async function shrink(file, max = 1100) { // resize before storing so browser storage doesn't fill up
  const url = URL.createObjectURL(file);
  try { const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; });
    const s = Math.min(1, max / Math.max(img.width, img.height)), cv = document.createElement("canvas"); cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s);
    const cx = cv.getContext("2d"); if (/png$/i.test(file.type)) { cx.drawImage(img, 0, 0, cv.width, cv.height); return cv.toDataURL("image/png"); }
    cx.fillStyle = "#fff"; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(img, 0, 0, cv.width, cv.height); return cv.toDataURL("image/jpeg", .85);
  } finally { URL.revokeObjectURL(url); }
}
