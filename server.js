const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 5500;
const NEWS_API_KEY = process.env.NEWS_API_KEY;
const NEWS_API_URL = "https://newsapi.org/v2/top-headlines";
const PUBLIC_DIR = __dirname;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function serveStatic(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
  const normalizedPath = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(PUBLIC_DIR, normalizedPath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": mimeTypes[ext] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    res.end(data);
  });
}

async function proxyNews(req, res) {
  if (!NEWS_API_KEY) {
    sendJson(res, 500, {
      status: "error",
      message: "Missing NEWS_API_KEY environment variable"
    });
    return;
  }

  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);
    const newsUrl = new URL(NEWS_API_URL);
    const allowedParams = ["country", "category", "q", "pageSize", "page"];

    allowedParams.forEach((key) => {
      const value = requestUrl.searchParams.get(key);
      if (value) newsUrl.searchParams.set(key, value);
    });
    newsUrl.searchParams.set("apiKey", NEWS_API_KEY);

    const response = await fetch(newsUrl);
    const payload = await response.json();
    sendJson(res, response.ok ? 200 : response.status, payload);
  } catch (error) {
    sendJson(res, 500, {
      status: "error",
      message: error.message || "Unable to reach NewsAPI"
    });
  }
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api/news")) {
    proxyNews(req, res);
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`SynthNews running at http://localhost:${PORT}`);
});
