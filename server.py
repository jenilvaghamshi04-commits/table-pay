"""Dependency-free HTTP entry point for the Salon Desk demo."""
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

PAGE = Path(__file__).with_name("index.html").read_bytes()

class Handler(BaseHTTPRequestHandler):
    def respond(self, head=False):
        path = urlsplit(self.path).path
        if path in ("/", "/index.html"):
            status, mime, body = 200, "text/html; charset=utf-8", PAGE
        elif path == "/health":
            status, mime, body = 200, "application/json", b'{"status":"ok"}'
        else:
            status, mime, body = 404, "text/plain; charset=utf-8", b"Not found"
        self.send_response(status)
        self.send_header("Content-Type", mime)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        if not head:
            self.wfile.write(body)

    def do_GET(self):
        self.respond()

    def do_HEAD(self):
        self.respond(head=True)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "10000"))
    print(f"Salon Desk listening on 0.0.0.0:{port}", flush=True)
    ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()
