const NEWS_API_ENDPOINT = "/api/news";
const NEWS_COUNTRY = "us";
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80";

const NEWS_CATEGORIES = [
  { label: "All", value: "all" },
  { label: "Business", value: "business" },
  { label: "Entertainment", value: "entertainment" },
  { label: "Health", value: "health" },
  { label: "Science", value: "science" },
  { label: "Sports", value: "sports" },
  { label: "Technology", value: "technology" }
];

let articles = [];
let sources = [];

const state = {
  category: "all",
  query: "",
  sort: "latest",
  loading: true,
  error: "",
  totalResults: 0,
  saved: new Set(JSON.parse(localStorage.getItem("pulsewire:saved") || "[]"))
};

const els = {
  categoryList: document.querySelector(".category-list"),
  searchInput: document.querySelector("#search-input"),
  sortSelect: document.querySelector("#sort-select"),
  refreshButton: document.querySelector("#refresh-button"),
  themeSwitch: document.querySelector("#theme-switch"),
  sourceList: document.querySelector("#source-list"),
  sourceCount: document.querySelector("#source-count"),
  featured: document.querySelector("#featured-story"),
  newsGrid: document.querySelector("#news-grid"),
  feedSummary: document.querySelector("#feed-summary"),
  articleCount: document.querySelector("#article-count"),
  bookmarkCount: document.querySelector("#bookmark-count"),
  trendCount: document.querySelector("#trend-count")
};

const savedTheme = localStorage.getItem("pulsewire:theme");
if (savedTheme === "dark") {
  document.documentElement.dataset.theme = "dark";
  els.themeSwitch.checked = true;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeUrl(value, fallback = "#") {
  try {
    const url = new URL(value, window.location.href);
    return ["http:", "https:"].includes(url.protocol) ? url.href : fallback;
  } catch {
    return fallback;
  }
}

function getReadTime(text) {
  const words = String(text || "").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 210));
}

function getRelativeTime(date) {
  if (!date || Number.isNaN(date.getTime())) return "Just now";

  const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
  const units = [
    ["year", 31536000],
    ["month", 2592000],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60]
  ];

  for (const [unit, value] of units) {
    const amount = Math.floor(seconds / value);
    if (amount >= 1) {
      return `${amount} ${unit}${amount === 1 ? "" : "s"} ago`;
    }
  }

  return "Just now";
}

function getCategoryLabel(value) {
  return NEWS_CATEGORIES.find((category) => category.value === value)?.label || "General";
}

function getNewsApiUrl() {
  const url = new URL(NEWS_API_ENDPOINT, window.location.origin);
  url.searchParams.set("country", NEWS_COUNTRY);
  url.searchParams.set("pageSize", "60");

  if (state.category !== "all") {
    url.searchParams.set("category", state.category);
  }

  if (state.query.trim()) {
    url.searchParams.set("q", state.query.trim());
  }

  return url.toString();
}

function normalizeArticle(article, index) {
  const title = article.title || "Untitled story";
  const summary = article.description || article.content || "Open the full story for more details.";
  const source = article.source?.name || "NewsAPI";
  const publishedDate = new Date(article.publishedAt || Date.now());
  const category = getCategoryLabel(state.category);

  return {
    id: article.url || `${title}-${index}`,
    source,
    category,
    title,
    summary: summary.replace(/\s+/g, " ").trim(),
    image: safeUrl(article.urlToImage, FALLBACK_IMAGE),
    link: safeUrl(article.url),
    minutes: getReadTime(`${title} ${summary}`),
    published: getRelativeTime(publishedDate),
    publishedDate,
    trend: category,
    author: article.author || source
  };
}

async function fetchNews() {
  state.loading = true;
  state.error = "";
  render();

  try {
    const response = await fetch(getNewsApiUrl(), { cache: "no-store" });
    const data = await response.json();

    if (!response.ok || data.status !== "ok") {
      throw new Error(data.message || `NewsAPI returned ${response.status}`);
    }

    articles = data.articles
      .filter((article) => article.title && article.url)
      .map(normalizeArticle)
      .sort((a, b) => b.publishedDate - a.publishedDate);

    state.totalResults = data.totalResults || articles.length;
    sources = [...new Map(articles.map((article) => [article.source, article])).values()].map((article) => ({
      name: article.source,
      type: article.category,
      reliability: "Live"
    }));

    state.loading = false;
    renderSources();
    renderCategories();
    render();
  } catch (error) {
    state.loading = false;
    state.error =
      "Could not load NewsAPI headlines. Start the local server with node server.js and open the localhost URL.";
    console.error(error);
    render();
  }
}

function renderSources() {
  els.sourceCount.textContent = `${sources.length || 1} live`;
  els.sourceList.innerHTML = (sources.length ? sources : [{ name: "NewsAPI", type: "Top headlines", reliability: "Live" }])
    .map(
      (source) => `
        <div class="source-item">
          <span>
            <strong>${escapeHtml(source.name)}</strong>
            <small>${escapeHtml(source.type)}</small>
          </span>
          <span class="source-dot" title="${escapeHtml(source.reliability)}"></span>
        </div>
      `
    )
    .join("");
}

function renderCategories() {
  els.categoryList.innerHTML = NEWS_CATEGORIES.map(
    (category) => `
      <button class="category-btn ${category.value === state.category ? "is-active" : ""}" data-category="${category.value}">
        ${escapeHtml(category.label)}
      </button>
    `
  ).join("");
}

function getFilteredArticles() {
  let items = [...articles];

  if (state.sort === "source") {
    items = items.sort((a, b) => a.source.localeCompare(b.source));
  }

  if (state.sort === "readTime") {
    items = items.sort((a, b) => a.minutes - b.minutes);
  }

  return items;
}

function renderFeatured(items) {
  if (state.loading) {
    els.featured.innerHTML = `
      <div class="featured-image" style="background-image: url('${FALLBACK_IMAGE}')">
        <div class="featured-content">
          <span class="pill">Loading NewsAPI</span>
          <h2>Fetching latest headlines</h2>
          <p>Connecting to live top headlines now.</p>
        </div>
      </div>
    `;
    return;
  }

  const story = items[0];
  if (!story) {
    els.featured.innerHTML = `
      <div class="featured-image" style="background-image: url('${FALLBACK_IMAGE}')">
        <div class="featured-content">
          <span class="pill">No stories</span>
          <h2>Nothing matched this view</h2>
          <p>Adjust the search or category filter to widen the feed.</p>
        </div>
      </div>
    `;
    return;
  }

  els.featured.innerHTML = `
    <a class="featured-image" href="${escapeHtml(story.link)}" target="_blank" rel="noreferrer" style="background-image: url('${escapeHtml(story.image)}')">
      <div class="featured-content">
        <span class="pill">${escapeHtml(story.category)} - ${escapeHtml(story.source)}</span>
        <h2>${escapeHtml(story.title)}</h2>
        <p>${escapeHtml(story.summary)}</p>
      </div>
    </a>
  `;
}

function renderCards(items) {
  if (state.loading) {
    els.newsGrid.innerHTML = `
      <div class="empty-state glass-panel">
        <h3>Loading live news</h3>
        <p>Pulling headlines from NewsAPI.</p>
      </div>
    `;
    return;
  }

  if (state.error) {
    els.newsGrid.innerHTML = `
      <div class="empty-state glass-panel">
        <h3>NewsAPI unavailable</h3>
        <p>${escapeHtml(state.error)}</p>
      </div>
    `;
    return;
  }

  if (!items.length) {
    els.newsGrid.innerHTML = `
      <div class="empty-state glass-panel">
        <h3>No stories found</h3>
        <p>Try another category or search term.</p>
      </div>
    `;
    return;
  }

  els.newsGrid.innerHTML = items
    .map((article) => {
      const isSaved = state.saved.has(article.id);
      return `
        <article class="news-card">
          <div class="news-card-inner">
            <a class="story-image" href="${escapeHtml(article.link)}" target="_blank" rel="noreferrer" style="background-image: url('${escapeHtml(article.image)}')" aria-label="Read ${escapeHtml(article.title)}"></a>
            <div class="story-body">
              <div class="story-kicker">
                <strong>${escapeHtml(article.category)}</strong>
                <button class="bookmark ${isSaved ? "is-saved" : ""}" data-id="${escapeHtml(article.id)}" type="button" aria-label="Save ${escapeHtml(article.title)}">
                  ${isSaved ? "Saved" : "Save"}
                </button>
              </div>
              <h3><a href="${escapeHtml(article.link)}" target="_blank" rel="noreferrer">${escapeHtml(article.title)}</a></h3>
              <p>${escapeHtml(article.summary)}</p>
              <div class="story-meta">
                <span>${escapeHtml(article.source)}</span>
                <span>${escapeHtml(article.published)} - ${article.minutes} min</span>
              </div>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderMetrics(items) {
  const trends = new Set(items.map((article) => article.trend));
  els.articleCount.textContent = items.length;
  els.bookmarkCount.textContent = state.saved.size;
  els.trendCount.textContent = trends.size;

  if (state.loading) {
    els.feedSummary.textContent = "Loading live NewsAPI updates";
  } else if (state.error) {
    els.feedSummary.textContent = "NewsAPI headlines could not be loaded";
  } else {
    const searchText = state.query.trim() ? ` matching "${state.query.trim()}"` : "";
    els.feedSummary.textContent = `Showing ${items.length} of ${state.totalResults} ${getCategoryLabel(state.category)} stories${searchText}`;
  }
}

function render() {
  const items = getFilteredArticles();
  renderFeatured(items);
  renderCards(items);
  renderMetrics(items);
}

function persistSaved() {
  localStorage.setItem("pulsewire:saved", JSON.stringify([...state.saved]));
}

function debounce(fn, delay = 450) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

const debouncedFetchNews = debounce(fetchNews);

els.categoryList.addEventListener("click", (event) => {
  const button = event.target.closest(".category-btn");
  if (!button) return;

  state.category = button.dataset.category;
  renderCategories();
  fetchNews();
});

els.searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  debouncedFetchNews();
});

els.sortSelect.addEventListener("change", (event) => {
  state.sort = event.target.value;
  render();
});

els.refreshButton.addEventListener("click", () => {
  els.refreshButton.animate(
    [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }],
    { duration: 500, easing: "ease" }
  );
  fetchNews();
});

els.themeSwitch.addEventListener("change", (event) => {
  const theme = event.target.checked ? "dark" : "light";
  document.documentElement.dataset.theme = theme === "dark" ? "dark" : "";
  localStorage.setItem("pulsewire:theme", theme);
});

els.newsGrid.addEventListener("click", (event) => {
  const button = event.target.closest(".bookmark");
  if (!button) return;

  const id = button.dataset.id;
  if (state.saved.has(id)) {
    state.saved.delete(id);
  } else {
    state.saved.add(id);
  }

  persistSaved();
  render();
});

renderSources();
renderCategories();
fetchNews();
setInterval(fetchNews, 5 * 60 * 1000);
