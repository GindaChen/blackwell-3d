"""Serve the static Vite build (dist/) on Modal.

    npm run deploy:modal      # = vite build && modal deploy deploy/modal_app.py

The site is plain static files, so this is one small ASGI app: FastAPI's StaticFiles with html=True
(so / serves index.html), plus long-lived caching for the content-hashed files under /assets.
"""
from pathlib import Path

import modal

DIST = Path(__file__).resolve().parent.parent / "dist"

image = (
    modal.Image.debian_slim(python_version="3.12")
    .pip_install("fastapi[standard]==0.115.*")
    .add_local_dir(DIST, remote_path="/site")
)

app = modal.App("chips-3d", image=image)


@app.function(min_containers=0, scaledown_window=300)
@modal.concurrent(max_inputs=200)
@modal.asgi_app(label="chips-3d")
def web():
    from fastapi import FastAPI, Request
    from fastapi.staticfiles import StaticFiles

    api = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)

    @api.middleware("http")
    async def cache_headers(request: Request, call_next):
        response = await call_next(request)
        if request.url.path.startswith("/assets/"):
            response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        elif request.url.path.startswith("/thumbs/"):
            response.headers["Cache-Control"] = "public, max-age=3600"
        return response

    api.mount("/", StaticFiles(directory="/site", html=True), name="site")
    return api
