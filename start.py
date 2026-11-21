"""Start the demo app with one command:   python start.py

Serves the app on http://127.0.0.1:<port>/app/ (localhost only), then opens it
in Chrome or Edge, which are needed for the "Connect Arduino" (Web Serial) button.
Only the app folder and config.js are served. Press Ctrl+C to stop.

Options:  --port 8000   pick a port (default: first free port from 8000)
          --no-browser  do not open a browser window
"""
import argparse
import http.server
import os
import posixpath
import shutil
import socket
import subprocess
import sys
import threading
import urllib.parse
import webbrowser

ROOT = os.path.dirname(os.path.abspath(__file__))


class AppHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        raw = urllib.parse.unquote(self.path.split("?", 1)[0].split("#", 1)[0])
        if raw in ("/", "/app"):
            self.send_response(302)
            self.send_header("Location", "/app/")
            self.end_headers()
            return
        # Decode and normalize first, so "%2e%2e" or "\" cannot climb out of app/.
        clean = posixpath.normpath(raw.replace("\\", "/"))
        if raw.endswith("/") and not clean.endswith("/"):
            clean += "/"
        if ".." in raw or not (clean == "/config.js" or clean.startswith("/app/")):
            self.send_error(404)
            return
        super().do_GET()

    def do_HEAD(self):
        self.do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        pass  # keep the console clean during the demo


def free_port(start):
    for port in range(start, start + 50):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    sys.exit("No free port found between %d and %d." % (start, start + 49))


def find_browser():
    candidates = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    ]
    for c in candidates:
        if os.path.isfile(c):
            return c
    for name in ("google-chrome", "chromium", "chromium-browser", "microsoft-edge"):
        found = shutil.which(name)
        if found:
            return found
    return None


def main():
    ap = argparse.ArgumentParser(description="Start the demo app.")
    ap.add_argument("--port", type=int, default=8000)
    ap.add_argument("--no-browser", action="store_true")
    args = ap.parse_args()

    if not os.path.isfile(os.path.join(ROOT, "app", "index.html")):
        sys.exit("app/index.html not found next to start.py.")

    port = free_port(args.port)
    url = "http://127.0.0.1:%d/app/" % port
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), AppHandler)
    threading.Thread(target=server.serve_forever, daemon=True).start()

    print("")
    print("  Demo app running at  %s" % url)
    print("  Connect Arduino works in Chrome or Edge on this address.")
    print("  Press Ctrl+C to stop.")
    print("")

    if not args.no_browser:
        browser = find_browser()
        if browser:
            subprocess.Popen([browser, "--new-window", url],
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        else:
            print("  Chrome or Edge not found, opening the default browser.")
            print("  (Connect Arduino needs Chrome or Edge.)")
            webbrowser.open(url)

    try:
        threading.Event().wait()
    except KeyboardInterrupt:
        print("\n  Stopped.")
        server.shutdown()


if __name__ == "__main__":
    main()
