#!/usr/bin/env python3
"""Tiny static server for triage.html that also accepts POST /save to write characters.txt.
Run:  python3 triage_server.py   (serves this folder on :8777)
"""
import http.server, socketserver, os

PORT = 8777
ROOT = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def do_POST(self):
        if self.path == "/save":
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length).decode("utf-8")
            with open(os.path.join(ROOT, "characters.txt"), "w", encoding="utf-8") as f:
                f.write(body)
            self.send_response(200)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(b"saved")
        else:
            self.send_error(404)

    def log_message(self, *a):
        pass  # quiet

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Triage server on http://localhost:{PORT}/triage.html  (POST /save -> characters.txt)")
    httpd.serve_forever()
