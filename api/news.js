const NEWS_API_URL = "https://newsapi.org/v2/top-headlines";

module.exports = async function handler(req, res) {
  const apiKey = process.env.NEWS_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      status: "error",
      message: "Missing NEWS_API_KEY environment variable"
    });
  }

  const newsUrl = new URL(NEWS_API_URL);
  const allowedParams = ["country", "category", "q", "pageSize", "page"];

  allowedParams.forEach((key) => {
    const value = req.query[key];
    if (typeof value === "string" && value.trim()) {
      newsUrl.searchParams.set(key, value.trim());
    }
  });

  newsUrl.searchParams.set("apiKey", apiKey);

  try {
    const response = await fetch(newsUrl);
    const payload = await response.json();
    return res.status(response.ok ? 200 : response.status).json(payload);
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message || "Unable to reach NewsAPI"
    });
  }
};
