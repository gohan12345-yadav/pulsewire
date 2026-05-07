# PulseWire

PulseWire is a modern, minimalist news aggregator built with HTML, CSS, and JavaScript. It uses a small Node.js proxy server to fetch live headlines from NewsAPI without exposing the API key in frontend code.

## Features

- Live NewsAPI top headlines
- Category filters
- Search
- Source list
- Featured story
- Bookmark saving with localStorage
- Light/dark theme toggle
- Glassmorphism UI

## Run Locally

1. Set your NewsAPI key:

```powershell
$env:NEWS_API_KEY="your_newsapi_key_here"
```

2. Start the server:

```powershell
node server.js
```

3. Open:

```text
http://localhost:5500
```

## Deploy To Vercel

1. Import this GitHub repository into Vercel.
2. Use `Other` as the framework preset.
3. Leave the build command and output directory empty.
4. Add an environment variable named `NEWS_API_KEY` with your NewsAPI key.
5. Deploy the project.

Vercel will serve the static frontend and run `api/news.js` as the NewsAPI proxy.
