#!/usr/bin/env python3
"""
TASK LIST OS: the little helper that runs your task list on this computer (Python version)
-----------------------------------------------------------------------------------------
The same as server.js, for computers that have Python 3 but not Node. Claude uses whichever
is available. It serves the task list app at http://localhost:4747 and lets it read and save
apps/task-list/data/tasks.json, plus the data files of any attached tools listed in apps/installed.json.

Safety: only listens on this computer (127.0.0.1), only serves the apps folder, only ever saves
the task file and attached tools' listed data files, keeps a backup (for example tasks.backup.json)
before every save, refuses requests from other websites.

It can also run a small Claude job straight away (sort a voice note, update a deal from call notes),
one at a time, only when the app asks, and only for a job a tool lists in apps/<tool>/claude-jobs.json.

Run it:      python3 apps/server/server.py
Other port:  TLOS_PORT=4848 python3 apps/server/server.py
"""
import json
import os
import re
import shutil
import subprocess
import sys
import threading
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote

PORT = int(os.environ.get("TLOS_PORT", "4747"))
HOST = "127.0.0.1"
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
APPS = os.path.join(ROOT, "apps")
DATA = os.path.join(APPS, "task-list", "data", "tasks.json")
INSTALLED = os.path.join(APPS, "installed.json")
# A tool's data file must live in its own data folder: apps/<tool>/data/<name>.json
HOME_LAYOUT = os.path.join(APPS, "home", "data", "layout.json")
BRAIN_DUMP = os.path.join(APPS, "home", "data", "braindump.json")  # the shared Brain dump, every tool's notes
DATA_FILE_RE = re.compile(r"^apps/[a-z0-9-]+/data/[a-z0-9-]+\.json$")
DATA_URL_RE = re.compile(r"^/api/data/([a-z0-9-]+)/([a-z0-9-]+\.json)(/meta)?$")
MAX_BODY = 10 * 1024 * 1024
# Asking Claude to do a small job: sort a voice note, update a deal (see server.js for the plain-English explanation)
AUTO_CLAUDE = os.environ.get("TLOS_AUTO_CLAUDE", "on") != "off"
_logs = os.path.join(os.path.expanduser("~"), "Library", "Logs")
CLAUDE_LOG = os.path.join(_logs if os.path.isdir(_logs) else os.environ.get("TMPDIR", "/tmp"), "task-list-os-claude.log")
RUN_LIMIT_S = 10 * 60
UNWATCHED = " Nobody is watching this run, so do not ask questions: make your best reading of anything unclear and say so in your notes."
SORT_JOB = {"key": "shared:brain-dump", "label": "sorting the brain dump",
            "prompt": ("A new brain dump has just been added. Follow .claude/skills/sort-brain-dump for the unsorted items in apps/home/data/braindump.json "
                       "(and any unsorted items in apps/task-list/data/tasks.json's dump). Be quick and change nothing else." + UNWATCHED)}
RUN_URL_RE = re.compile(r"^/api/claude/run/([a-z0-9-]+)/([a-z0-9-]+)$")
# One run at a time. Asking again for a job that's already waiting doesn't queue it twice.
claude_run = {"running": False, "queued": False, "job": None, "startedAt": None, "lastRunAt": None, "lastResult": None, "lastJob": None}
claude_queue = []
claude_lock = threading.Lock()


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def find_claude():
    if os.environ.get("TLOS_CLAUDE"):
        return os.environ["TLOS_CLAUDE"]
    found = shutil.which("claude")
    if found:
        return found
    for d in (os.path.expanduser("~/.local/bin"), os.path.expanduser("~/.claude/local"), "/usr/local/bin", "/opt/homebrew/bin"):
        for name in ("claude", "claude.exe", "claude.cmd"):
            full = os.path.join(d, name)
            if os.access(full, os.X_OK):
                return full
    return None


def tool_job(tool_id, name):
    """A job a tool lists in apps/<tool>/claude-jobs.json, for tools in apps/installed.json only. None for anything else."""
    tool = next((t for t in installed_tools() if isinstance(t, dict) and t.get("id") == tool_id), None)
    app = tool.get("app") if tool and isinstance(tool.get("app"), str) else ""
    if not re.match(r"^apps/[a-z0-9-]+/$", app) or app in ("apps/shared/", "apps/server/"):
        return None
    try:
        with open(os.path.join(ROOT, *app.split("/"), "claude-jobs.json"), "r", encoding="utf-8") as f:
            jobs = json.load(f).get("jobs")
    except (OSError, ValueError, AttributeError):
        return None
    job = jobs.get(name) if isinstance(jobs, dict) else None
    if not isinstance(job, dict) or not isinstance(job.get("prompt"), str) or not job["prompt"].strip():
        return None
    label = job["label"][:80] if isinstance(job.get("label"), str) else name
    return {"key": tool_id + ":" + name, "label": label, "prompt": job["prompt"][:4000] + UNWATCHED}


def _claude_worker(binary):
    while True:
        with claude_lock:
            if not claude_queue:
                claude_run["running"] = False
                claude_run["queued"] = False
                claude_run["job"] = None
                return
            job = claude_queue.pop(0)
            claude_run["queued"] = len(claude_queue) > 0
            claude_run["job"] = job["key"]
            claude_run["startedAt"] = now_iso()
        with open(CLAUDE_LOG, "a") as log:
            log.write("\n--- %s %s\n" % (claude_run["startedAt"], job["label"]))
            log.flush()
            try:
                result = subprocess.run([binary, "-p", job["prompt"]], cwd=ROOT, stdout=log, stderr=log, timeout=RUN_LIMIT_S)
                outcome = "ok" if result.returncode == 0 else "failed"
            except (OSError, subprocess.TimeoutExpired):
                outcome = "failed"
        with claude_lock:
            claude_run["lastRunAt"] = now_iso()
            claude_run["lastResult"] = outcome
            claude_run["lastJob"] = job["key"]


def run_claude(job):
    binary = find_claude()
    with claude_lock:
        if not binary:
            claude_run["lastResult"] = "not-installed"
            return False
        # A job already running is queued once more, so it also sees anything added since it started
        if not any(j["key"] == job["key"] for j in claude_queue):
            claude_queue.append(job)
        if claude_run["running"]:
            claude_run["queued"] = True
            return True
        claude_run["running"] = True
    threading.Thread(target=_claude_worker, args=(binary,), daemon=True).start()
    return True


TYPES = {
    ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".png": "image/png",
    ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8", ".ico": "image/x-icon",
}


def modified(path=DATA):
    try:
        return os.stat(path).st_mtime * 1000
    except OSError:
        return 0


def installed_tools():
    """The tools in this folder, from apps/installed.json. If it's missing or unreadable, just the task list."""
    try:
        with open(INSTALLED, "r", encoding="utf-8") as f:
            tools = json.load(f).get("tools")
    except (OSError, ValueError, AttributeError):
        tools = None
    return tools if isinstance(tools, list) else [{"id": "task-list", "app": "apps/task-list/", "dataFiles": ["apps/task-list/data/tasks.json"]}]


def data_file_for(tool_id, file_name):
    """The file behind /api/data/<tool>/<file>, or None if that tool isn't installed or the file isn't one of its own."""
    # Home's own file: which boxes show, in what order and how wide
    if tool_id == "home":
        return HOME_LAYOUT if file_name == "layout.json" else BRAIN_DUMP if file_name == "braindump.json" else None
    for tool in installed_tools():
        if not isinstance(tool, dict) or tool.get("id") != tool_id or not isinstance(tool.get("dataFiles"), list):
            continue
        # A tool may only save inside its own app folder, never another tool's data or the shared parts
        app = tool.get("app") if isinstance(tool.get("app"), str) else ""
        if not re.match(r"^apps/[a-z0-9-]+/$", app) or app in ("apps/shared/", "apps/server/"):
            continue
        for rel in tool["dataFiles"]:
            if not isinstance(rel, str) or not DATA_FILE_RE.match(rel) or rel.endswith(".backup.json") or not rel.startswith(app + "data/"):
                continue
            if rel.rsplit("/", 1)[-1] == file_name:
                return os.path.join(ROOT, *rel.split("/"))
    return None


def home_page():
    """The page http://localhost:4747 opens: Home, or (in an older copy without it) the first tool in apps/installed.json."""
    if os.path.exists(os.path.join(APPS, "home", "index.html")):
        return "/home/"
    tools = installed_tools()
    app = tools[0].get("app") if tools and isinstance(tools[0], dict) else None
    return "/" + app[5:] if isinstance(app, str) and re.match(r"^apps/[a-z0-9-]+/$", app) else "/task-list/"


def save_file(path, text):
    """Keep a backup, write a temporary file, then swap it in, so a save is never half-written."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if os.path.exists(path):
        with open(path, "rb") as src, open(path[:-5] + ".backup.json", "wb") as dst:
            dst.write(src.read())
    tmp = path + ".saving"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(text)
    os.replace(tmp, path)


class Handler(BaseHTTPRequestHandler):
    server_version = "TaskListOS"

    def log_message(self, *args):  # keep the terminal quiet
        pass

    def send(self, status, body, ctype="text/plain; charset=utf-8", extra=None):
        data = body if isinstance(body, bytes) else body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(data)

    def send_json(self, status, obj):
        self.send(status, json.dumps(obj), TYPES[".json"])

    def host_ok(self):
        return re.match(r"^(localhost|127\.0\.0\.1)(:\d+)?$", self.headers.get("Host", ""), re.I) is not None

    def origin_ok(self):
        origin = self.headers.get("Origin")
        return origin is None or origin in ("http://localhost:%d" % PORT, "http://127.0.0.1:%d" % PORT)

    def read_file(self, path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                text = f.read()
        except OSError:
            return self.send_json(404, {"error": "missing"})
        return self.send(200, text, TYPES[".json"], {"X-Modified": str(modified(path))})

    def do_GET(self):
        if not self.host_ok():
            return self.send(403, "Not allowed")
        url = self.path.split("?")[0]
        if url == "/api/alive.js":
            return self.send(200, "window.tlosAlive = true;", TYPES[".js"])
        if url == "/api/info":  # where this folder is, so "Open in Claude" can start Claude Code right here
            return self.send_json(200, {"folder": ROOT})
        if url == "/api/tasks/meta":
            return self.send_json(200, {"modified": modified()})
        if url == "/api/tasks":
            return self.read_file(DATA)
        m = DATA_URL_RE.match(url)
        if m:
            path = data_file_for(m.group(1), m.group(2))
            if not path:
                return self.send_json(404, {"error": "not an installed tool's data file"})
            if m.group(3):
                return self.send_json(200, {"modified": modified(path)})
            return self.read_file(path)
        if url == "/api/claude/status":
            with claude_lock:
                snapshot = dict(claude_run)
            return self.send_json(200, dict(snapshot, available=AUTO_CLAUDE and bool(find_claude())))
        if url.startswith("/api/"):
            return self.send_json(404, {"error": "not found"})
        if url in ("/", ""):
            self.send_response(302)
            self.send_header("Location", home_page())
            self.end_headers()
            return
        rel = unquote(url)
        if rel.endswith("/"):
            rel += "index.html"
        path = os.path.abspath(os.path.join(APPS, "." + rel))
        if not path.startswith(APPS + os.sep) or path.endswith(".backup.json") or path.endswith(".saving"):
            return self.send(403, "Not allowed")
        try:
            with open(path, "rb") as f:
                body = f.read()
        except OSError:
            return self.send(404, "Not found")
        self.send(200, body, TYPES.get(os.path.splitext(path)[1].lower(), "application/octet-stream"))

    do_HEAD = do_GET

    def refuse(self):
        self.send(405, "Not allowed")

    def do_POST(self):
        if not self.host_ok():
            return self.send(403, "Not allowed")
        url = self.path.split("?")[0]
        run = RUN_URL_RE.match(url)
        if url != "/api/claude/sort-brain-dump" and not run:
            return self.refuse()
        if not self.origin_ok() or "application/json" not in self.headers.get("Content-Type", ""):
            return self.send_json(403, {"error": "forbidden"})
        job = tool_job(run.group(1), run.group(2)) if run else SORT_JOB
        if not job:
            return self.send_json(404, {"error": "no such job"})
        if not AUTO_CLAUDE:
            return self.send_json(503, {"error": "turned off"})
        if run_claude(job):
            return self.send_json(202, {"started": True})
        return self.send_json(503, {"error": "claude not installed"})

    do_DELETE = do_PATCH = do_OPTIONS = refuse

    def do_PUT(self):
        if not self.host_ok() or not self.origin_ok():
            return self.send_json(403, {"error": "forbidden"})
        url = self.path.split("?")[0]
        if url == "/api/tasks":
            path = DATA
        else:
            m = DATA_URL_RE.match(url)
            if not m:
                return self.send_json(404, {"error": "not found"})
            if m.group(3):
                return self.send_json(405, {"error": "not allowed"})
            path = data_file_for(m.group(1), m.group(2))
            if not path:
                return self.send_json(404, {"error": "not an installed tool's data file"})
        if "application/json" not in self.headers.get("Content-Type", ""):
            return self.send_json(415, {"error": "json only"})
        length = int(self.headers.get("Content-Length", "0") or 0)
        if length > MAX_BODY:
            return self.send_json(413, {"error": "too large"})
        try:
            data = json.loads(self.rfile.read(length).decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            return self.send_json(400, {"error": "not valid"})
        if not isinstance(data, dict):
            return self.send_json(400, {"error": "not valid"})
        if path == DATA and not isinstance(data.get("tasks"), list):
            return self.send_json(400, {"error": "no tasks list"})
        try:
            save_file(path, json.dumps(data, indent=2, ensure_ascii=False) + "\n")
        except OSError:
            return self.send_json(500, {"error": "save failed"})
        self.send_json(200, {"modified": modified(path)})


if __name__ == "__main__":
    try:
        httpd = ThreadingHTTPServer((HOST, PORT), Handler)
    except OSError:
        print("Task List OS: port %d is already in use. It may already be running: open http://localhost:%d" % (PORT, PORT), file=sys.stderr)
        sys.exit(1)
    print("Task List OS is running at http://localhost:%d" % PORT)
    httpd.serve_forever()
