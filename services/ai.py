"""AI provider abstraction. Add a class + register it in PROVIDERS to support another provider."""
import os, requests

RULES = ("You are a resume writing assistant. Use ONLY facts present in the provided text. "
         "Never invent skills, employers, metrics, dates or qualifications. If a number is missing, do not add one. "
         "Return only the requested content, no preamble.")
ACTIONS = {
    "summary": "Write a 3-sentence professional summary from this resume data.",
    "improve_summary": "Improve this professional summary. Keep it factual and concise.",
    "project": "Rewrite this project description as 2-3 strong, factual bullet points (start each with '- ').",
    "bullets": "Rewrite this as concise experience bullet points starting with strong action verbs (each line starts with '- ').",
    "achievement": "Improve this achievement description without adding facts.",
    "skills": "Suggest up to 10 additional skills clearly implied by this content (comma separated). Do not add unsupported ones.",
    "verbs": "Suggest 12 strong action verbs suited to this content, comma separated.",
    "grammar": "Fix grammar and spelling only. Keep meaning and wording.",
    "concise": "Make this text more concise without losing facts.",
    "tailor": "Rewrite this text to emphasise relevance to the target job description, using only facts already in the text.",
    "alternatives": "Give 3 alternative rewrites, separated by lines containing only '---'.",
}

class BaseProvider:
    configured = False
    def run(self, action, text, job="", context=""):
        raise NotImplementedError
    def prompt(self, action, text, job, context):
        if action not in ACTIONS: raise ValueError("Unknown AI action")
        p = f"{RULES}\n\nTask: {ACTIONS[action]}\n\nText:\n{text[:4000]}"
        if context: p += f"\n\nResume context:\n{context[:3000]}"
        if job: p += f"\n\nTarget job description:\n{job[:3000]}"
        return p

class GeminiProvider(BaseProvider):
    def __init__(self):
        self.key = os.getenv("AI_API_KEY", "")
        self.model = os.getenv("AI_MODEL", "gemini-2.5-flash")
        self.configured = bool(self.key)
    def run(self, action, text, job="", context=""):
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"
        r = requests.post(url, headers={"x-goog-api-key": self.key, "Content-Type": "application/json"},
                          json={"contents": [{"parts": [{"text": self.prompt(action, text, job, context)}]}]}, timeout=30)
        if r.status_code != 200: raise RuntimeError(f"provider returned {r.status_code}")
        return r.json()["candidates"][0]["content"]["parts"][0]["text"].strip()

PROVIDERS = {"gemini": GeminiProvider}
def get_provider():
    return PROVIDERS.get(os.getenv("AI_PROVIDER", "gemini").lower(), GeminiProvider)()
