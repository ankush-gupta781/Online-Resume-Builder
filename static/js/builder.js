const COLS = ["#3f4ee0", "#0e7490", "#047857", "#b45309", "#be123c", "#111827"], FILT = ["All", "ATS-friendly", "Classic", "Modern", "Creative"]; let tf = "All";
const T = "text", M = "month", A = "area";
const STEPS = [
 { id: "start", t: "Create My Resume", type: "start" },
 { id: "template", t: "Select Template", type: "design" },
 { id: "personal", t: "Personal Information", type: "obj", key: "personal", f: [["fullName", "Full name", T], ["email", "Email", T], ["phone", "Phone", T], ["city", "City / state", T], ["linkedin", "LinkedIn URL", T], ["github", "GitHub URL", T], ["portfolio", "Portfolio", T], ["website", "Website", T]] },
 { id: "summary", t: "Professional Summary", type: "summary" },
 { id: "education", t: "Education", type: "list", key: "education", item: "education", f: [["degree", "Degree", T], ["major", "Major", T], ["institution", "Institution", T], ["location", "Location", T], ["start", "Start", M], ["end", "Graduation", M], ["gpa", "CGPA / percentage", T], ["coursework", "Coursework", A], ["achievements", "Achievements", A]] },
 { id: "experience", t: "Work Experience", type: "list", key: "experience", item: "job", f: [["title", "Job title", T], ["company", "Company", T], ["location", "Location", T], ["start", "Start", M], ["end", "End (empty = Present)", M], ["responsibilities", "Responsibilities (one per line)", A, 1], ["achievements", "Achievements (one per line)", A, 1], ["technologies", "Technologies", T]] },
 { id: "internships", t: "Internships", type: "list", key: "internships", item: "internship", f: [["title", "Role", T], ["company", "Company", T], ["location", "Location", T], ["start", "Start", M], ["end", "End", M], ["responsibilities", "Responsibilities (one per line)", A, 1], ["achievements", "Achievements", A, 1], ["technologies", "Technologies", T]] },
 { id: "skills", t: "Skills", type: "skills" },
 { id: "projects", t: "Projects", type: "list", key: "projects", item: "project", gh: 1, f: [["name", "Project name", T], ["duration", "Duration", T], ["technologies", "Technologies", T], ["github", "GitHub link", T], ["live", "Live link", T], ["description", "Description", A, 1], ["features", "Features (one per line)", A], ["achievements", "Achievements", A]] },
 { id: "certifications", t: "Certifications", type: "list", key: "certifications", item: "certification", up: 1, f: [["name", "Certificate name", T], ["issuer", "Issuer", T], ["date", "Date", M], ["credentialId", "Credential ID", T], ["url", "URL", T]] },
 { id: "achievements", t: "Achievements", type: "list", key: "achievements", item: "achievement", up: 1, f: [["title", "Title", T], ["organization", "Organization", T], ["date", "Date", M], ["description", "Description", A, 1], ["evidence", "Evidence link", T]] },
 { id: "volunteering", t: "Volunteering", type: "list", key: "volunteering", item: "role", f: [["title", "Role", T], ["organization", "Organization", T], ["start", "Start", M], ["end", "End", M], ["description", "Description", A, 1]] },
 { id: "additional", t: "Additional Sections", type: "list", key: "additional", item: "section", f: [["title", "Section title (Languages, Publications, Hackathons, Research, Awards…)", T], ["text", "Content (one per line)", A]] },
 { id: "target", t: "Target Job", type: "target" },
 { id: "preview", t: "Preview and Download", type: "final" },
];
let D = RB.load(), cur = Math.max(0, STEPS.findIndex(s => s.id === location.hash.slice(1))), visited = new Set([cur]), aiOk = null, consent = false;
const get = (o, p) => p.split(".").reduce((a, k) => a == null ? a : a[k], o);
function set(o, p, v) { const ks = p.split("."); const l = ks.pop(); ks.reduce((a, k) => a[k], o)[l] = v; }
let st; function save() { clearTimeout(st); $("#saved").textContent = "Saving…"; st = setTimeout(() => { RB.save(D) && ($("#saved").textContent = "Draft saved"); }, 250); }
function refresh() { const s = $("#stage"), has = hasData(D); s.innerHTML = renderResume(has ? D : Object.assign({}, DEMO, { design: D.design }), { images: true }); fitStage(s); const n = $("#pvnote"); if (n) n.textContent = has ? "A4 preview · dashed line marks the end of page 1" : "Sample content shown. Your details replace it as you type."; }
function fld(path, [k, l, ty, wide]) {
  const v = esc(get(D, path + "." + k) || ""), id = path + "." + k;
  const ai = ty === A && /respons|descr|achiev|summary/i.test(k) ? `<div style="margin-top:4px">${[["improve", "Improve"], ["concise", "Concise"], ["grammar", "Grammar"], ["alternatives", "Alternatives"], ["tailor", "Tailor to job"]].map(([a, n]) => `<button type="button" class="btn sm" data-ai="${a}" data-p="${id}">${n}</button>`).join(" ")}</div>` : "";
  return `<div class="${wide ? "w" : ""}"><label>${l}</label>${ty === A ? `<textarea data-p="${id}">${v}</textarea>` : `<input type="${ty === M ? "month" : "text"}" data-p="${id}" value="${v}">`}<div class="note err" data-e="${id}"></div>${ai}</div>`;
}
function entryForm(s, i) {
  return `<div class="entry"><div class="tools"><button class="btn sm" data-mv="${s.key}:${i}:-1">↑</button><button class="btn sm" data-mv="${s.key}:${i}:1">↓</button><button class="btn sm" data-rm="${s.key}:${i}">Remove</button></div><div class="f">${s.f.map(f => fld(`${s.key}.${i}`, f)).join("")}</div></div>`;
}
function upBox(sec) { const cert = sec === "certifications", ach = sec === "achievements";
  return `<div class="addz"><div><h3>Upload a ${cert ? "certificate" : ach ? "proof or award" : "document"}</h3><p class="note" style="margin:0 0 10px">PDF, PNG or JPG, up to 6 MB. We read the text, you check it, then it's added. <b>Upload as PNG</b> if you want the certificate image to appear in your resume.</p>
<div class="drop" id="drop" tabindex="0"><b>Drop a file here</b><br><span class="note">or click to browse</span><input id="file" type="file" accept=".pdf,.png,.jpg,.jpeg" hidden></div><div class="bar-p"><b id="upb"></b></div><div id="flist"></div></div>
<div class="write"><div><h3>${cert ? "Add one by hand" : "Describe it in your words"}</h3><p class="note" style="margin:0">${cert ? "No file? Type the certificate details." : "Say what you achieved, even roughly. Add details only you know; nothing is invented."}</p></div><p style="margin:14px 0 0"><button class="btn pri" id="descr" data-kind="${cert ? "certifications" : "achievements"}">${cert ? "Enter certificate details" : "Describe an achievement"}</button></p></div></div>`; }
function imgBox() { return `<div class="card" style="margin:0 0 16px;padding:18px"><h3 style="font-size:18px">Add certificate or achievement images</h3><p class="note" style="margin:0 0 10px">Images added here appear in your resume (preview and PDF). Please upload them as <b>PNG</b> (JPG also works). PDFs can be read for details on the Certifications or Achievements step but can't be shown as images.</p><div class="drop" id="drop" tabindex="0"><b>Drop a PNG here</b><br><span class="note">or click to browse</span><input id="file" type="file" accept=".png,.jpg,.jpeg" hidden></div><div id="flist"></div></div>`; }
function addFile(name, data) { if (RB.files.length >= 8) return toast("You can add up to 8 images."); RB.files.push({ name, data }); if (!RB.saveFiles()) RB.files.pop(); flist(); refresh(); }
async function attachImage(f) { try { addFile(f.name, await shrink(f)); toast("Image added to your resume"); } catch (e) { toast("Could not read that image."); } }
function flist() { const e = $("#flist"); if (!e) return; e.innerHTML = RB.files.map((f, i) => `<div style="display:flex;gap:10px;align-items:center;margin-top:8px">${f.data.startsWith("data:image") ? `<img src="${f.data}" width="44" height="44" style="object-fit:cover;border-radius:6px">` : "📄"}<span style="flex:1;font-size:13px">${esc(f.name)}</span><button class="btn sm" data-del="${i}">Delete</button></div>`).join(""); }

function draw() {
  const s = STEPS[cur]; visited.add(cur); let h = `<p class="kick">Step ${cur + 1} of ${STEPS.length}</p><h2 class="step-h">${s.t}</h2>`;
  if (s.type === "obj") h += `<div class="f">${s.f.map(f => fld(s.key, f)).join("")}</div><p class="note">LinkedIn: direct import isn't available. <a href="#" id="li">Paste profile text or upload a LinkedIn PDF</a> and copy details across after reviewing.</p>`;
  if (s.type === "summary") h += `<div class="f"><div class="w"><label>Professional summary</label><textarea data-p="summary" style="min-height:120px">${esc(D.summary)}</textarea><div style="margin-top:4px"><button class="btn sm" data-ai="summary" data-p="summary">Generate from my resume</button> ${["improve", "concise", "grammar", "alternatives", "tailor"].map(a => `<button class="btn sm" data-ai="${a}" data-p="summary">${{ improve: "Improve", concise: "Concise", grammar: "Grammar", alternatives: "Alternatives", tailor: "Tailor to job" }[a]}</button>`).join(" ")}</div></div><div class="w"><label>Career objective (optional, used if no summary)</label><textarea data-p="objective">${esc(D.objective)}</textarea></div></div><p class="note">AI Resume Assistant sends only the text you choose (plus resume context for “Generate”) to an external AI service, after your confirmation.</p>`;
  if (s.type === "list") {
    if (s.up) h += upBox(s.id);
    if (s.id === "projects") {}
    if (s.gh) h += `<div class="card" style="margin-bottom:14px"><b>Import public GitHub repositories</b><div style="display:flex;gap:8px;margin-top:8px"><input id="ghu" placeholder="GitHub username" value="${esc((D.personal.github || "").replace(/.*github\.com\//, "").replace(/\/.*/, ""))}"><button class="btn" id="ghgo">Fetch</button></div><div id="ghl"></div></div>`;
    h += (D[s.key] || []).map((_, i) => entryForm(s, i)).join("") || `<p class="note">Nothing added. This section is optional and is hidden from the resume if empty.</p>`;
    h += `<button class="btn" data-add="${s.key}">+ Add ${s.item}</button>`;
  }
  if (s.type === "skills") h += `<div class="f">${Object.keys(D.skills).map(k => fld("skills", [k, k[0].toUpperCase() + k.slice(1) + " (comma separated)", T, 1])).join("")}</div><p><button class="btn" data-ai="skills" data-p="skills.technical">Suggest relevant skills</button> <button class="btn" data-ai="verbs" data-p="skills.technical">Suggest action verbs</button></p>`;
  if (s.type === "target") h += `<div class="f"><div class="w"><label>Target job title</label><input data-p="target.title" value="${esc(D.target.title)}"></div><div class="w"><label>Job description (optional)</label><textarea data-p="target.jd" style="min-height:160px">${esc(D.target.jd)}</textarea></div></div><p class="note">Used for keyword suggestions in the ATS Analyzer and for the “Tailor to job” writing help.</p>`;
  if (s.type === "start") h += startUI();
  if (s.type === "design") h += designUI();
  if (s.type === "final") h += `<p>Review the preview, then export.</p>${imgBox()}<p style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn pri" id="pdf">DOWNLOAD RESUME PDF</button><button class="btn" id="print">Print</button><button class="btn" id="ver">Save as version</button><button class="btn" id="exp">Export data</button><button class="btn" id="clr">Clear all data</button></p><p class="note">Every field is stored only in this browser. Use Clear all data to remove it, including uploaded images.</p>`;
  $("#form").innerHTML = h; $("#steps").className = "stepper"; $("#steps").innerHTML = STEPS.map((x, i) => `<button class="${i === cur ? "on" : visited.has(i) ? "done" : ""}" data-s="${i}"><i>${i + 1}</i>${x.t}</button>`).join("");
  const on = $("#steps .on"); document.title = STEPS[cur].t + " · Online Resume Builder"; on && on.scrollIntoView({ inline: "center", block: "nearest" }); $("#prog").style.width = ((cur + 1) / STEPS.length * 100) + "%"; $("#prev").style.visibility = cur ? "visible" : "hidden"; $("#next").style.visibility = cur < STEPS.length - 1 ? "visible" : "hidden";
  flist(); refresh();
}
function startUI() { const has = hasData(D);
  return `<p class="note" style="font-size:15px;margin-top:-8px">Start here, pick a template next, then fill in your details. Skip anything optional.</p><div class="startg">
  <button class="sc main" data-start="new"><span class="i">✨</span><b>Start a new resume</b><small>${has ? "Your current draft is saved as a version first." : "Begin with a clean page."}</small></button>
  ${has ? `<button class="sc" data-start="cont"><span class="i">📝</span><b>Continue my draft</b><small>Pick up where you left off${D.personal.fullName ? " as " + esc(D.personal.fullName) : ""}.</small></button>` : ""}</div>`; }
function designUI() {
  const d = D.design, base = hasData(D) ? D : DEMO, fav = D.fav || [];
  const list = TPLS.filter(([id]) => tf === "All" || TMETA[id][1].includes(tf)).sort((a, b) => fav.includes(b[0]) - fav.includes(a[0]));
  return `<p class="note" style="margin-top:-8px">${hasData(D) ? "Previews use your details." : "Previews use sample content until you add your own."} Click a template to select it; the big preview updates live.</p>
  <div class="flt">${FILT.map(f => `<button class="pl ${f === tf ? "on" : ""}" data-f="${f}">${f}</button>`).join("")}</div>
  <div class="tplg">${list.map(([id, n]) => `<div class="tpl ${d.template === id ? "sel" : ""}" data-tpl="${id}"><button class="star ${fav.includes(id) ? "on" : ""}" data-fav="${id}" title="Favourite">★</button><span class="chk">Selected</span><div class="thumb">${renderResume(Object.assign({}, base, { design: Object.assign({}, d, { template: id, layout: id === "ats" || id === "sidebar" ? "one" : d.layout }) }), { nobreak: 1 })}</div><b>${n}</b><small>${TMETA[id][0]}</small><div class="tg">${TMETA[id][1].map(t => `<i class="${t[0] === "A" ? "a" : ""}">${t}</i>`).join("")}</div></div>`).join("") || '<p class="note">No templates in this filter.</p>'}</div>
  <h3 style="margin-top:22px;font-size:20px">Make it yours</h3><div class="f"><div><label>Accent colour</label>${COLS.map(c => `<button class="sw ${d.color === c ? "on" : ""}" style="background:${c}" data-col="${c}" title="${c}"></button>`).join("")}<input type="color" data-p="design.color" value="${esc(d.color)}" style="width:44px;padding:2px;vertical-align:middle"></div>
  <div><label>Font</label><select data-p="design.font">${[["serif", "Serif"], ["sans", "Sans-serif"], ["mono", "Monospace"]].map(([v, n]) => `<option value="${v}" ${d.font === v ? "selected" : ""}>${n}</option>`).join("")}</select></div>
  <div><label>Layout</label><select data-p="design.layout"><option value="one" ${d.layout !== "two" ? "selected" : ""}>Single column (ATS-safe)</option><option value="two" ${d.layout === "two" ? "selected" : ""}>Two columns</option></select></div></div>
  <h3 style="margin-top:18px;font-size:18px">Section order</h3>${D.order.map((k, i) => `<div style="display:flex;gap:6px;align-items:center;margin:4px 0"><span style="flex:1">${k[0].toUpperCase() + k.slice(1)}</span><button class="btn sm" data-ord="${i}:-1">↑</button><button class="btn sm" data-ord="${i}:1">↓</button></div>`).join("")}`;
}

// ----- events -----
document.addEventListener("input", e => {
  const p = e.target.dataset && e.target.dataset.p; if (!p) return; set(D, p, e.target.value);
  const er = $(`[data-e="${CSS.escape(p)}"]`); if (er) er.textContent = ""; save(); refresh();
  if (p.startsWith("design.")) { $$(".tpl").forEach(t => t.classList.toggle("sel", t.dataset.tpl === D.design.template)); }
});
document.addEventListener("click", async e => {
  const b = e.target.closest("button,.tpl,.drop,a#li"); if (!b) return; const ds = b.dataset;
  if (ds.s) { cur = +ds.s; draw(); scrollTo(0, 0); }
  else if (ds.add) { D[ds.add].push({}); save(); draw(); }
  else if (ds.rm) { const [k, i] = ds.rm.split(":"); D[k].splice(+i, 1); save(); draw(); }
  else if (ds.mv) { const [k, i, d] = ds.mv.split(":").map((x, n) => n ? +x : x), a = D[k], t = i + d; if (t >= 0 && t < a.length) { [a[i], a[t]] = [a[t], a[i]]; save(); draw(); } }
  else if (ds.ord) { const [i, d] = ds.ord.split(":").map(Number), a = D.order, t = i + d; if (t >= 0 && t < a.length) { [a[i], a[t]] = [a[t], a[i]]; save(); draw(); } }
  else if (ds.start) { if (ds.start === "new") { if (hasData(D)) { const v = RB.versions(); v.push({ name: "Draft before new resume · " + new Date().toLocaleString(), data: D, at: Date.now() }); RB.saveVersions(v); } D = RB.empty(); RB.save(D); cur = 1; } else cur = 2; draw(); scrollTo(0, 0); }
  else if (ds.fav) { D.fav = D.fav || []; const k = D.fav.indexOf(ds.fav); k < 0 ? D.fav.push(ds.fav) : D.fav.splice(k, 1); save(); draw(); }
  else if (ds.f) { tf = ds.f; draw(); }
  else if (ds.col) { D.design.color = ds.col; save(); draw(); }
  else if (ds.tpl) { D.design.template = ds.tpl; if (ds.tpl === "ats") D.design.layout = "one"; save(); draw(); }
  else if (ds.ai) aiRun(ds.ai, ds.p, b);
  else if (ds.del) { RB.files.splice(+ds.del, 1); RB.saveFiles(); flist(); refresh(); toast("Image deleted"); }
  else if (ds.rep) { window._rep = +ds.rep; $("#file") ? $("#file").click() : toast("Open an upload step to replace files"); }
  else if (b.id === "descr") describeModal(ds.kind);
  else if (b.id === "drop") $("#file").click();
  else if (b.id === "li") { e.preventDefault(); linkedinModal(); }
  else if (b.id === "ghgo") ghFetch();
  else if (b.id === "pdf" || b.id === "pdfTop") { RB.save(D); downloadPdf(D, b); }
  else if (b.id === "print") printResume();
  else if (b.id === "ver") { const v = RB.versions(); v.push({ name: (D.target.title || "Resume") + " · " + new Date().toLocaleString(), data: D, at: Date.now() }); RB.saveVersions(v); toast("Version saved"); }
  else if (b.id === "exp") { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(D, null, 1)], { type: "application/json" })); a.download = "resume-data.json"; a.click(); }
  else if (b.id === "clr") { if (confirm("Delete all resume data, versions and uploaded files from this browser?")) { localStorage.removeItem(RB.KEY); localStorage.removeItem(RB.VKEY); localStorage.removeItem("rb_files"); RB.files = []; D = RB.empty(); cur = 0; draw(); toast("All data cleared"); } }
});
document.addEventListener("change", e => {
  if (e.target.id === "file") { const f = e.target.files[0]; if (f) handleFile(f); e.target.value = ""; }
  if (e.target.id === "imp") { const f = e.target.files[0]; if (!f) return; f.text().then(t => { try { D = Object.assign(RB.empty(), JSON.parse(t)); RB.save(D); cur = 1; draw(); toast("Data imported"); } catch (x) { toast("That file is not valid resume data."); } }); }
  if (e.target.dataset && e.target.dataset.p && e.target.tagName === "SELECT") { set(D, e.target.dataset.p, e.target.value); save(); refresh(); }
});
document.addEventListener("focusout", e => { const p = e.target.dataset && e.target.dataset.p; if (!p) return; const v = e.target.value.trim(), er = $(`[data-e="${CSS.escape(p)}"]`); if (!er || !v) return;
  if (p.endsWith("email") && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) er.textContent = "Enter a valid email like name@example.com";
  if (p.endsWith("phone") && !/^[+\d][\d\s\-()]{6,}$/.test(v)) er.textContent = "Enter a valid phone number";
  if (/linkedin|github|portfolio|website|\.url$|\.live$/.test(p) && !/^(https?:\/\/)?[\w-]+(\.[\w-]+)+/.test(v)) er.textContent = "Enter a valid link"; });
$("#prev").onclick = () => { cur--; draw(); scrollTo(0, 0); };
$("#next").onclick = () => { if (STEPS[cur].id === "start") { cur = 1; draw(); return; } if ($$(".err").some(x => x.textContent)) return toast("Fix the highlighted fields first."); cur++; draw(); scrollTo(0, 0); };
$("#fs").onclick = () => { $("#full").classList.add("open"); $("#fsStage").innerHTML = renderResume(D, { images: true }); fitStage($("#fsStage"), 1.3); };
$("#fsClose").onclick = () => $("#full").classList.remove("open");
$$("#tabs button").forEach(b => b.onclick = () => { $("#split").className = "split m-" + b.dataset.t; $$("#tabs button").forEach(x => x.classList.toggle("pri", x === b)); refresh(); });
addEventListener("resize", () => fitStage($("#stage")));
$("#modal").onclick = e => { if (e.target.id === "modal") $("#modal").classList.remove("open"); };
function modal(html) { $("#modalBody").innerHTML = html; $("#modal").classList.add("open"); }
const closeModal = () => $("#modal").classList.remove("open");
function printResume() { const w = open("", "_blank"); if (!w) return toast("Allow pop-ups to print"); w.document.write(`<html><head><title>Resume</title><link rel="stylesheet" href="/static/css/style.css"><style>body{background:#fff}.page{box-shadow:none;margin:0 auto;transform:none!important}.pb{display:none}@page{size:A4;margin:0}</style></head><body>${renderResume(D, { nobreak: 1, images: true })}</body></html>`); w.document.close(); w.onload = () => setTimeout(() => w.print(), 300); }

// ----- AI -----
async function aiRun(action, path, btn) {
  if (aiOk === null) aiOk = (await api("/api/status", null)).ai;
  if (!aiOk) return modal(`<h3>AI Resume Assistant unavailable</h3><p>No AI key is configured on this server. Everything else still works. See the README to enable it.</p><button class="btn" onclick="closeModal()">Close</button>`);
  const text = get(D, path) || "";
  if (!text.trim() && !["summary", "skills", "verbs"].includes(action)) return toast("Write some text first, then ask for help.");
  const ctx = ["summary", "skills", "verbs"].includes(action) ? JSON.stringify({ edu: D.education, exp: D.experience, projects: D.projects, skills: D.skills }).slice(0, 2800) : "";
  if (!consent) { if (!confirm("AI features send the selected text" + (ctx ? ", your resume content" : "") + (action === "tailor" ? " and your target job description" : "") + " to an external AI service. Continue?")) return; consent = true; }
  const old = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spin"></span>';
  const r = await api("/api/ai", { action, text, context: ctx, job: action === "tailor" ? D.target.jd : "" });
  btn.disabled = false; btn.innerHTML = old;
  if (!r.ok) return toast(r.error);
  const opts = action === "alternatives" ? r.text.split(/^\s*---\s*$/m).map(x => x.trim()).filter(Boolean) : [r.text];
  const info = action === "skills" || action === "verbs";
  modal(`<h3>AI suggestion</h3><p class="note">Check every line. Only keep what is true for you.</p>${opts.map((o, i) => `<div class="entry"><div style="white-space:pre-wrap" id="o${i}">${esc(o)}</div><p>${info ? `<button class="btn sm pri" data-use="${i}">Add to ${action === "skills" ? "Technical skills" : "clipboard"}</button>` : `<button class="btn sm pri" data-use="${i}">Use this</button>`}</p></div>`).join("")}<button class="btn" onclick="closeModal()">Dismiss</button>`);
  $$("[data-use]").forEach(u => u.onclick = () => { const t = opts[+u.dataset.use];
    if (action === "verbs") navigator.clipboard && navigator.clipboard.writeText(t); else if (action === "skills") set(D, path, ((get(D, path) || "") + (get(D, path) ? ", " : "") + t.replace(/\n/g, ", ")));
    else set(D, path, t); save(); closeModal(); draw(); });
}
// ----- uploads -----
function handleFile(f) {
  if (f.size > 6 * 1024 * 1024) return toast("File is larger than 6 MB.");
  if (STEPS[cur].id === "preview") { if (!/\.(png|jpe?g)$/i.test(f.name)) return toast("Please upload a PNG image here. PDFs can be added on the Certifications or Achievements step."); return attachImage(f); }
  if (!/\.(pdf|png|jpe?g)$/i.test(f.name)) return toast("Use a PDF, PNG or JPG file.");
  const fd = new FormData(); fd.append("file", f), bar = $("#upb"), x = new XMLHttpRequest(); x.open("POST", "/api/extract");
  x.upload.onprogress = e => { if (bar && e.lengthComputable) bar.style.width = (e.loaded / e.total * 100) + "%"; };
  x.onload = async () => { if (bar) bar.style.width = "100%"; let r; try { r = JSON.parse(x.responseText); } catch (e) { r = { ok: false, error: "Server error" }; } if (!r.ok) return toast(r.error);
    let data = null; if (/\.(png|jpe?g)$/i.test(f.name)) { try { data = await shrink(f); } catch (e) { data = null; } }
        reviewModal(f, r, data); setTimeout(() => bar && (bar.style.width = 0), 600); };
  x.onerror = () => toast("Upload failed. Check your connection."); x.send(fd);
}
function reviewModal(f, r, data) {
  const s = r.suggestion || { section: "certifications", name: f.name.replace(/\.\w+$/, "") };
  modal(`<h3>Review extracted details</h3>${r.message ? `<p class="note">${esc(r.message)}</p>` : `<p class="note">Extracted by ${esc(r.method)}. Edit anything that's wrong.</p>`}
  <div class="f"><div><label>Add to section</label><select id="rs">${["certifications", "achievements", "projects"].map(k => `<option ${k === s.section ? "selected" : ""}>${k}</option>`).join("")}</select></div><div><label>Name / title</label><input id="rn" value="${esc(s.name)}"></div><div><label>Issuer / organization</label><input id="ri" value="${esc(s.issuer || "")}"></div><div><label>Date</label><input id="rd" value="${esc(s.date || "")}"></div><div><label>Credential ID</label><input id="rc" value="${esc(s.credentialId || "")}"></div><div><label>URL</label><input id="ru" value="${esc(s.url || "")}"></div></div>
  <details style="margin:10px 0"><summary class="note">Show extracted text</summary><pre style="white-space:pre-wrap;font-size:12px;max-height:160px;overflow:auto">${esc(r.text || "")}</pre></details>
  <button class="btn pri" id="rok">Add to resume</button> <button class="btn" onclick="closeModal()">Cancel</button>`);
  $("#rok").onclick = () => { const k = $("#rs").value, n = $("#rn").value.trim(); if (!n) return toast("Add a name first.");
    const e = k === "certifications" ? { name: n, issuer: $("#ri").value, date: $("#rd").value, credentialId: $("#rc").value, url: $("#ru").value } : k === "achievements" ? { title: n, organization: $("#ri").value, date: $("#rd").value, evidence: $("#ru").value } : { name: n, github: $("#ru").value };
    D[k].push(e); if (data) addFile(f.name, data); else if (/\.pdf$/i.test(f.name)) toast("PDF read for details. Upload it as a PNG to show the certificate in your resume."); save(); closeModal(); cur = STEPS.findIndex(x => x.id === k); draw(); toast("Added to " + k); };
}
function linkedinModal() {
  modal(`<h3>LinkedIn details</h3><p class="note">Direct LinkedIn import isn't supported. Paste your profile text or upload the PDF from LinkedIn (Profile → More → Save to PDF), then copy what you need.</p><textarea id="lt" style="min-height:160px" placeholder="Paste profile text…"></textarea><p><input type="file" id="lf" accept=".pdf"></p><button class="btn pri" id="lu">Use text as my summary</button> <button class="btn" onclick="closeModal()">Close</button>`);
  $("#lf").onchange = async e => { const fd = new FormData(); fd.append("file", e.target.files[0]); const r = await (await fetch("/api/extract", { method: "POST", body: fd })).json(); r.ok ? $("#lt").value = r.text : toast(r.error); };
  $("#lu").onclick = () => { if (!$("#lt").value.trim()) return toast("Nothing to use."); D.summary = $("#lt").value.trim().slice(0, 800); save(); closeModal(); toast("Added as summary. Edit it on step 2."); };
}
async function ghFetch() {
  const u = $("#ghu").value.trim(), box = $("#ghl"); box.innerHTML = '<span class="spin"></span>'; const r = await api("/api/github/" + encodeURIComponent(u));
  if (!r.ok) return box.innerHTML = `<p class="err">${esc(r.error)}</p>`;
  box.innerHTML = r.repos.map((x, i) => `<label style="display:flex;gap:8px;margin-top:6px;color:var(--ink)"><input type="checkbox" data-r="${i}"><span><b>${esc(x.name)}</b> ${esc(x.language)} <span class="note">${esc(x.description)}</span></span></label>`).join("") + '<p><button class="btn pri sm" id="ghadd">Add selected</button></p>';
  $("#ghadd").onclick = () => { $$("[data-r]:checked").forEach(c => { const x = r.repos[+c.dataset.r]; D.projects.push({ name: x.name, description: x.description, technologies: x.language, github: x.url }); }); save(); draw(); };
}
draw(); if (localStorage.getItem(RB.KEY) && D.personal.fullName) toast("Draft restored");

function describeModal(kind) {
  const cert = kind === "certifications";
  modal(`<h3>${cert ? "Certificate details" : "Describe your achievement"}</h3><div class="f"><div class="w"><label>${cert ? "Certificate name" : "Title (a few words)"}</label><input id="dn" placeholder="${cert ? "e.g. Python for Everybody" : "e.g. Winner, college hackathon"}"></div>
  <div><label>${cert ? "Issuer" : "Organization / event"}</label><input id="di"></div><div><label>Date</label><input id="dd" type="month"></div>
  ${cert ? '<div><label>Credential ID</label><input id="dc"></div><div><label>Verification URL</label><input id="du"></div>' : '<div class="w"><label>What happened? (plain words are fine)</label><textarea id="dx" placeholder="What did you do, what was the result?"></textarea><div style="margin-top:6px"><button class="btn sm" id="dai">Polish my wording</button></div></div>'}</div>
  <p style="margin-top:14px"><button class="btn pri" id="dok">Add to resume</button> <button class="btn" onclick="closeModal()">Cancel</button></p>`);
  const dai = $("#dai"); if (dai) dai.onclick = async () => { const t = $("#dx").value; if (!t.trim()) return toast("Write a sentence first.");
    if (aiOk === null) aiOk = (await api("/api/status", null)).ai; if (!aiOk) return toast("AI Resume Assistant isn't set up on this server. Your own wording is fine.");
    if (!consent && !confirm("This sends the text you wrote to an external AI service. Continue?")) return; consent = true; dai.disabled = true;
    const r = await api("/api/ai", { action: "achievement", text: t }); dai.disabled = false; r.ok ? ($("#dx").value = r.text) : toast(r.error); };
  $("#dok").onclick = () => { const n = $("#dn").value.trim(); if (!n) return toast("Add a title first.");
    D[kind].push(cert ? { name: n, issuer: $("#di").value, date: $("#dd").value, credentialId: $("#dc").value, url: $("#du").value } : { title: n, organization: $("#di").value, date: $("#dd").value, description: $("#dx").value });
    save(); closeModal(); draw(); toast("Added"); };
}
