# Deep Forensic Analysis API Suite - Technical Design Document

## 1. Architecture & Conventions

### 1.1 Overview
The system is designed as a suite of 50 independent microservices. Each microservice handles a specific forensic data extraction, scraping, or conversion task. They are designed to be deployed as separate standard microservices (e.g., using Docker, Kubernetes, or Render Web Services) with independent scaling capabilities.

### 1.2 Communication Protocol
- **Protocol:** HTTP/1.1 or HTTP/2 over TLS (HTTPS).
- **Format:** JSON for requests and responses (`application/json`).
- **Authentication:** API Key passed via `Authorization: Bearer <token>` or `x-api-key` header.

### 1.3 Standardized Response Wrapper
Every API response will follow a standard envelope to ensure consistent error handling and metadata parsing.
```json
{
  "success": true,
  "data": { ... },
  "metadata": {
    "timestamp": "2023-10-25T12:00:00Z",
    "execution_time_ms": 1450,
    "request_id": "req-12345"
  },
  "error": null
}
```

### 1.4 Error Handling
Standard HTTP status codes apply:
- `200 OK`: Successful extraction.
- `400 Bad Request`: Invalid payload or parameters.
- `401 Unauthorized`: Missing or invalid API key.
- `404 Not Found`: Target resource not found or no longer exists.
- `429 Too Many Requests`: Rate limit exceeded.
- `500 Internal Server Error`: Upstream failure or scraping logic broken.

### 1.5 Scraping Mechanisms
Services will utilize a mix of:
- **Headless Browsers:** Puppeteer/Playwright for heavy JS apps (e.g., SPA, Cloudflare protected).
- **HTTP Clients:** Axios/Requests with Cheerio/BeautifulSoup for static HTML scraping.
- **Proxy Networks:** Residential proxies for rotating IPs to bypass anti-bot mechanisms.

## 2. API Services 1 to 10

### 2.1 Instagram Video Scraper - Lite
- **Description:** Scrape Instagram video metadata: titles, likes, formats, dates. Bulk URLs supported.
- **Endpoint:** `POST /api/v1/instagram/video-metadata`
- **Mechanism:** HTTP API with mobile user-agents.
- **Request Payload:**
```json
{
  "urls": ["https://www.instagram.com/reel/XYZ123/"],
  "use_proxies": true,
  "timeout": 30000
}
```
- **Response Data Schema:**
```json
{
  "url": "https://www.instagram.com/reel/XYZ123/",
  "title": "A funny video",
  "likes_count": 1500,
  "comments_count": 45,
  "upload_date": "2023-10-20T14:30:00Z",
  "format": "mp4",
  "dimensions": {"width": 1080, "height": 1920}
}
```

### 2.2 PDF to HTML Converter - Fast & Responsive
- **Description:** Transform PDF documents into responsive HTML pages.
- **Endpoint:** `POST /api/v1/document/pdf-to-html`
- **Mechanism:** Document processing library (e.g., pdf2htmlEX, MuPDF).
- **Request Payload:** Multipart form data (`file`) or URL.
```json
{
  "pdf_url": "https://example.com/document.pdf",
  "embed_images": true
}
```
- **Response Data Schema:**
```json
{
  "html_url": "https://cdn.example.com/converted/doc_123.html",
  "pages_converted": 12,
  "file_size_bytes": 102400
}
```

### 2.3 Vimeo Profile Scraper
- **Description:** Scrape Vimeo profiles, bios, HD images + raw JSON-LD.
- **Endpoint:** `POST /api/v1/vimeo/profile`
- **Mechanism:** HTTP GET Request parsing JSON-LD and HTML.
- **Request Payload:**
```json
{
  "urls": ["https://vimeo.com/user123456"]
}
```
- **Response Data Schema:**
```json
{
  "username": "user123456",
  "bio": "Filmmaker from NY.",
  "hd_image_url": "https://i.vimeocdn.com/portrait/...",
  "json_ld": { ... },
  "followers_count": 250
}
```

### 2.4 Free Youtube Playlist Scraper
- **Description:** Extract data from YouTube playlists including titles, descriptions, thumbnails.
- **Endpoint:** `POST /api/v1/youtube/playlist`
- **Mechanism:** YouTube Data API v3 or yt-dlp wrapped HTTP.
- **Request Payload:**
```json
{
  "playlist_id": "PLXxyz123...",
  "max_results": 50
}
```
- **Response Data Schema:**
```json
{
  "playlist_title": "My Favorite Songs",
  "channel_id": "UCxyz123...",
  "videos": [
    {
      "video_id": "vXyZ123",
      "title": "Song Title",
      "thumbnail_url": "https://i.ytimg.com/vi/vXyZ123/hqdefault.jpg"
    }
  ]
}
```

### 2.5 Instagram Post & Image Scraper
- **Description:** Scrape Image, Post Metadata & download HD images from any Instagram post.
- **Endpoint:** `POST /api/v1/instagram/post-metadata`
- **Mechanism:** Puppeteer/Playwright with session cookies.
- **Request Payload:**
```json
{
  "urls": ["https://www.instagram.com/p/ABC456/"],
  "download_images": true
}
```
- **Response Data Schema:**
```json
{
  "url": "...",
  "caption": "Beautiful sunset!",
  "likes": 1200,
  "hashtags": ["#sunset", "#nature"],
  "images": [
    {"url": "...", "codec": "jpeg", "width": 1080}
  ]
}
```

### 2.6 Instagram Post Downloader - Media & Post Scraper
- **Description:** Download all images & videos from any post + extract technical metadata.
- **Endpoint:** `POST /api/v1/instagram/media-downloader`
- **Mechanism:** HTTP Request + API reverse engineering.
- **Request Payload:**
```json
{
  "urls": ["https://www.instagram.com/p/DEF789/"]
}
```
- **Response Data Schema:**
```json
{
  "media_type": "carousel",
  "author": "photographer123",
  "media": [
    {"url": "...", "type": "image", "resolution": "1080x1080"}
  ]
}
```

### 2.7 LeadLocator Pro (Google Maps Scraper)
- **Description:** Extract local business data, contact info (phone/emails) from Google Maps.
- **Endpoint:** `POST /api/v1/google-maps/lead-locator`
- **Mechanism:** Puppeteer parsing Google Maps JSON payloads.
- **Request Payload:**
```json
{
  "location": "New York, NY",
  "keyword": "Plumber",
  "limit": 20
}
```
- **Response Data Schema:**
```json
{
  "results": [
    {
      "name": "NY Plumbers Inc.",
      "address": "123 Main St, NY",
      "phone": "+1-212-555-1234",
      "website": "http://nyplumbers.com",
      "emails_found": ["contact@nyplumbers.com"]
    }
  ]
}
```

### 2.8 TeraBox Video Downloader & Audio Extractor
- **Description:** Instantly download TeraBox videos & MP3s.
- **Endpoint:** `POST /api/v1/terabox/downloader`
- **Mechanism:** Headless browser for auth + direct file link extraction.
- **Request Payload:**
```json
{
  "url": "https://terabox.com/s/1xyz...",
  "format": "mp3"
}
```
- **Response Data Schema:**
```json
{
  "file_name": "video_audio.mp3",
  "download_url": "https://cdn.terabox.com/dl/...",
  "size_mb": 5.2
}
```

### 2.9 YouTube Transcript Downloader + Timestamp Export
- **Description:** Extract and generate transcripts from YouTube videos.
- **Endpoint:** `POST /api/v1/youtube/transcript`
- **Mechanism:** Official API / parsing `player_response` JSON.
- **Request Payload:**
```json
{
  "video_url": "https://www.youtube.com/watch?v=XYZ123",
  "language": "en"
}
```
- **Response Data Schema:**
```json
{
  "video_id": "XYZ123",
  "language": "en",
  "transcript": [
    {"start": 0.5, "duration": 2.0, "text": "Hello world"},
    {"start": 3.0, "duration": 4.5, "text": "Welcome to my video"}
  ]
}
```

### 2.10 Telegram Video Downloader & Metadata Extractor
- **Description:** Download Telegram videos & MP3s + extract metadata.
- **Endpoint:** `POST /api/v1/telegram/media-metadata`
- **Mechanism:** Telegram API (Telethon/Pyrogram) or Web version parsing.
- **Request Payload:**
```json
{
  "post_urls": ["https://t.me/channelname/1234"]
}
```
- **Response Data Schema:**
```json
{
  "channel": "channelname",
  "post_id": 1234,
  "text": "Check out this video!",
  "media_url": "https://api.telegram.org/file/bot.../video.mp4",
  "duration": 120,
  "thumbnail": "..."
}
```

## 3. API Services 11 to 20

### 3.1 YouTube Music Downloader
- **Description:** Instantly grab MP3s from YouTube Music URLs, extract audio + metadata.
- **Endpoint:** `POST /api/v1/ytmusic/downloader`
- **Mechanism:** yt-dlp wrapped HTTP API.
- **Request Payload:**
```json
{
  "url": "https://music.youtube.com/watch?v=123",
  "format": "mp3",
  "quality": "320kbps"
}
```
- **Response Data Schema:**
```json
{
  "title": "Song Name",
  "artist": "Artist Name",
  "duration_sec": 240,
  "thumbnail_url": "...",
  "download_url": "..."
}
```

### 3.2 YouTube Video Formats Scraper
- **Description:** Unlock full YouTube video data – extract 4K/HD/SD formats, DASH streams.
- **Endpoint:** `POST /api/v1/youtube/formats`
- **Mechanism:** InnerTube API parser.
- **Request Payload:**
```json
{
  "video_url": "https://www.youtube.com/watch?v=XYZ123"
}
```
- **Response Data Schema:**
```json
{
  "video_id": "XYZ123",
  "formats": [
    {"itag": 137, "quality": "1080p", "type": "video/mp4", "url": "..."}
  ]
}
```

### 3.3 YouTube Video Captions Scraper
- **Description:** Instantly grab auto-generated subtitles from any public YouTube video.
- **Endpoint:** `POST /api/v1/youtube/captions`
- **Mechanism:** YouTube Internal API (TimedText).
- **Request Payload:**
```json
{
  "video_url": "https://www.youtube.com/watch?v=XYZ123",
  "lang_code": "en"
}
```
- **Response Data Schema:**
```json
{
  "language": "en",
  "is_auto_generated": true,
  "captions_url": "...",
  "text_content": "Full string of captions..."
}
```

### 3.4 Spotify Tracks Downloader
- **Description:** Download any Spotify track with advanced filters, 11 formats (MP3, FLAC, WAV).
- **Endpoint:** `POST /api/v1/spotify/track-downloader`
- **Mechanism:** Librespot or Spotify Web Player API + Audio stream capture.
- **Request Payload:**
```json
{
  "track_url": "https://open.spotify.com/track/123",
  "format": "flac"
}
```
- **Response Data Schema:**
```json
{
  "track_name": "Song Title",
  "album": "Album Name",
  "release_date": "2023-01-01",
  "download_url": "...",
  "format": "flac",
  "bitrate": "1411kbps"
}
```

### 3.5 Vimeo Video Downloader
- **Description:** Download Vimeo videos & MP3s + metadata! Secure Apify links.
- **Endpoint:** `POST /api/v1/vimeo/video-downloader`
- **Mechanism:** Extract player JSON configuration (`vimeo.config`).
- **Request Payload:**
```json
{
  "video_url": "https://vimeo.com/12345678"
}
```
- **Response Data Schema:**
```json
{
  "title": "Creative Film",
  "author": "Director Name",
  "mp4_urls": [
    {"quality": "1080p", "url": "..."}
  ]
}
```

### 3.6 TikTok Video Transcriber
- **Description:** Extract accurate speech-to-text transcripts in 12 languages.
- **Endpoint:** `POST /api/v1/tiktok/transcriber`
- **Mechanism:** TikTok API (closed captions) or Whisper AI integration.
- **Request Payload:**
```json
{
  "video_url": "https://www.tiktok.com/@user/video/123",
  "translate_to": "en"
}
```
- **Response Data Schema:**
```json
{
  "original_language": "es",
  "transcript": "...",
  "translated_text": "..."
}
```

### 3.7 Bank Routing Number Lookup
- **Description:** Effortlessly retrieve and validate US bank information using routing numbers.
- **Endpoint:** `POST /api/v1/finance/routing-lookup`
- **Mechanism:** Federal Reserve E-Payments Routing Directory Database (Static lookup).
- **Request Payload:**
```json
{
  "routing_number": "123456789"
}
```
- **Response Data Schema:**
```json
{
  "bank_name": "Chase Bank",
  "address": "123 Main St",
  "city": "New York",
  "state": "NY",
  "zip": "10001",
  "is_valid": true
}
```

### 3.8 Fastest Sephora - All in One - Scraper
- **Description:** Web scraper to extract product information, prices, reviews, ratings from Sephora.
- **Endpoint:** `POST /api/v1/ecommerce/sephora-scraper`
- **Mechanism:** HTTP API querying Sephora internal GraphQL/REST.
- **Request Payload:**
```json
{
  "product_url": "https://www.sephora.com/product/xyz"
}
```
- **Response Data Schema:**
```json
{
  "product_name": "Lipstick",
  "brand": "Fenty Beauty",
  "price": 25.0,
  "currency": "USD",
  "rating": 4.8,
  "reviews_count": 1200
}
```

### 3.9 Glassdoor Scraper - Company Reviews & Salary Data
- **Description:** Extract verified salary data, anonymous employee reviews, and company ratings.
- **Endpoint:** `POST /api/v1/jobs/glassdoor-scraper`
- **Mechanism:** HTTP API bypassing Cloudflare + GraphQL parsing.
- **Request Payload:**
```json
{
  "company_url": "https://www.glassdoor.com/Overview/Working-at-TechCorp-EI_IE123.11,19.htm"
}
```
- **Response Data Schema:**
```json
{
  "company_name": "TechCorp",
  "overall_rating": 4.2,
  "salary_ranges": [
    {"role": "Software Engineer", "range": "$100k-$150k"}
  ],
  "recent_reviews": ["Great place to work!", "Long hours."]
}
```

### 3.10 Indeed Scraper - Global Job Listings
- **Description:** Extract millions of job listings from Indeed for effective mass hiring and analytics.
- **Endpoint:** `POST /api/v1/jobs/indeed-scraper`
- **Mechanism:** Puppeteer + Residential Proxies to bypass bot protection.
- **Request Payload:**
```json
{
  "keyword": "Data Scientist",
  "location": "San Francisco, CA",
  "limit": 50
}
```
- **Response Data Schema:**
```json
{
  "jobs": [
    {
      "title": "Senior Data Scientist",
      "company": "AI StartUp",
      "location": "San Francisco, CA",
      "salary": "$130k - $160k",
      "url": "..."
    }
  ]
}
```

## 4. API Services 21 to 30

### 4.1 LinkedIn Scraper - Professional Network Jobs
- **Description:** Professional LinkedIn job scraping API extracts comprehensive job listings.
- **Endpoint:** `POST /api/v1/jobs/linkedin-scraper`
- **Mechanism:** HTTP API (Voyager) without auth or rotating residential proxies for login sessions.
- **Request Payload:**
```json
{
  "keyword": "DevOps Engineer",
  "location": "London",
  "remote": true
}
```
- **Response Data Schema:**
```json
{
  "jobs": [
    {
      "job_title": "Sr. DevOps",
      "company": "Fintech LTD",
      "salary_range": "£80k-£100k",
      "benefits": ["Healthcare", "Pension"],
      "url": "..."
    }
  ]
}
```

### 4.2 PDF to HTML Converter Lite
- **Description:** Transform your PDF documents into responsive HTML pages (Pay Per Result).
- **Endpoint:** `POST /api/v1/document/pdf-to-html-lite`
- **Mechanism:** Cloud-native PDF parsing logic.
- **Request Payload:**
```json
{
  "pdf_url": "https://example.com/small.pdf",
  "max_pages": 20
}
```
- **Response Data Schema:**
```json
{
  "html_url": "https://cdn.example.com/lite_converted/doc_456.html",
  "pages_converted": 5
}
```

### 4.3 arXiv Article Metadata Scraper
- **Description:** Discover top arXiv papers with fast metadata extraction!
- **Endpoint:** `POST /api/v1/academic/arxiv-scraper`
- **Mechanism:** arXiv Open Archives Initiative (OAI) API wrapper.
- **Request Payload:**
```json
{
  "query": "quantum computing",
  "sort_by": "submittedDate"
}
```
- **Response Data Schema:**
```json
{
  "articles": [
    {
      "title": "A new quantum algorithm",
      "authors": ["John Doe", "Jane Smith"],
      "abstract": "...",
      "pdf_link": "https://arxiv.org/pdf/1234.5678"
    }
  ]
}
```

### 4.4 Telegram Downloader - Message & Media
- **Description:** Professional Telegram extractor for complete message history, media files, and metadata.
- **Endpoint:** `POST /api/v1/telegram/channel-history`
- **Mechanism:** Telethon/Pyrogram API using session strings.
- **Request Payload:**
```json
{
  "channel_url": "https://t.me/news_channel",
  "limit": 100
}
```
- **Response Data Schema:**
```json
{
  "messages": [
    {
      "id": 5566,
      "date": "2023-10-21T09:00:00Z",
      "text": "Breaking news!",
      "media_type": "photo",
      "media_url": "..."
    }
  ]
}
```

### 4.5 Extract Emails, Contacts, & Socials from Any Website
- **Description:** Fast, accurate email, phone, and social media extraction from any website.
- **Endpoint:** `POST /api/v1/osint/website-contact-extractor`
- **Mechanism:** Multi-threaded crawler (Cheerio/Playwright) scanning DOM and common regex patterns.
- **Request Payload:**
```json
{
  "url": "https://www.targetcompany.com",
  "crawl_depth": 2
}
```
- **Response Data Schema:**
```json
{
  "domain": "targetcompany.com",
  "emails": ["info@targetcompany.com", "sales@targetcompany.com"],
  "phones": ["+1-800-555-0199"],
  "social_profiles": {
    "linkedin": "https://linkedin.com/company/target",
    "twitter": "https://twitter.com/target"
  }
}
```

### 4.6 Extract Emails, Socials and Contacts (Fastest version)
- **Description:** An advanced Actor for extracting email addresses, social links and contact details from websites.
- **Endpoint:** `POST /api/v1/osint/website-contact-extractor-fast`
- **Mechanism:** Go-based concurrent HTTP fetcher + Regex matching (no JS rendering).
- **Request Payload:**
```json
{
  "url": "https://www.startup.io"
}
```
- **Response Data Schema:**
```json
{
  "url": "https://www.startup.io",
  "emails": ["founders@startup.io"],
  "socials": ["https://github.com/startupio"]
}
```

### 4.7 Google Maps Business with Emails Extractor
- **Description:** Extract complete business information from Google Maps including email addresses.
- **Endpoint:** `POST /api/v1/google-maps/business-emails`
- **Mechanism:** Google Maps API/Scraper + domain crawling for email resolution.
- **Request Payload:**
```json
{
  "query": "Restaurants in Paris",
  "extract_emails": true
}
```
- **Response Data Schema:**
```json
{
  "businesses": [
    {
      "name": "Le Bistro",
      "rating": 4.5,
      "address": "10 Rue de Paris",
      "website": "http://lebistro.fr",
      "email": "contact@lebistro.fr"
    }
  ]
}
```

### 4.8 TikTok Frame Extractor - Get Video Thumbnails & Cover Images
- **Description:** Extract high-quality cover images and thumbnails from any TikTok video instantly.
- **Endpoint:** `POST /api/v1/tiktok/frame-extractor`
- **Mechanism:** TikTok raw JSON hydration parser (`__NEXT_DATA__` extraction).
- **Request Payload:**
```json
{
  "video_url": "https://www.tiktok.com/@user/video/123"
}
```
- **Response Data Schema:**
```json
{
  "cover_image_url": "https://p16-sign.tiktokcdn.com/...jpg",
  "dynamic_cover_url": "https://p16-sign.tiktokcdn.com/...webp",
  "duration_sec": 15
}
```

### 4.9 Bing Copilot [API]
- **Description:** Use Bing's Copilot via API! No API key.
- **Endpoint:** `POST /api/v1/ai/bing-copilot`
- **Mechanism:** Edge-GPT websocket reverse engineering.
- **Request Payload:**
```json
{
  "prompt": "Write a summary about forensic analysis.",
  "conversation_style": "precise"
}
```
- **Response Data Schema:**
```json
{
  "response": "Forensic analysis is the application of scientific methods...",
  "sources": [
    {"title": "Wikipedia", "url": "..."}
  ]
}
```

### 4.10 Keyword Density Checker
- **Description:** Analyzes webpage content to calculate keyword density and frequency.
- **Endpoint:** `POST /api/v1/seo/keyword-density`
- **Mechanism:** Cheerio DOM parser + NLP tokenization (NLTK/SpaCy).
- **Request Payload:**
```json
{
  "url": "https://blog.example.com/article"
}
```
- **Response Data Schema:**
```json
{
  "total_words": 1500,
  "top_keywords": [
    {"word": "forensic", "count": 25, "density_percentage": 1.66},
    {"word": "analysis", "count": 20, "density_percentage": 1.33}
  ]
}
```

## 5. API Services 31 to 40

### 5.1 Leboncoin Vehicle Scraper (PPE)
- **Description:** Scrape vehicle listings from France’s largest classifieds platform, Leboncoin.
- **Endpoint:** `POST /api/v1/vehicles/leboncoin-scraper`
- **Mechanism:** HTTP API utilizing Leboncoin's hidden GraphQL endpoints + French Proxies.
- **Request Payload:**
```json
{
  "brand": "Renault",
  "max_price": 10000,
  "zipcode": "75001"
}
```
- **Response Data Schema:**
```json
{
  "listings": [
    {
      "title": "Renault Clio IV",
      "price": 8500,
      "mileage_km": 65000,
      "year": 2016,
      "seller_type": "pro",
      "url": "..."
    }
  ]
}
```

### 5.2 Bing Copilot [API] - Advanced
- **Description:** Bing Copilot via API with multi-turn conversation support.
- **Endpoint:** `POST /api/v1/ai/bing-copilot-advanced`
- **Mechanism:** WebSockets simulating Edge browser client.
- **Request Payload:**
```json
{
  "prompt": "What are the latest updates?",
  "session_id": "conv_789"
}
```
- **Response Data Schema:**
```json
{
  "text": "Here are the updates...",
  "suggested_replies": ["Tell me more", "Thanks"]
}
```

### 5.3 Link Extractor Pro: URL to HTML List Downloader
- **Description:** Maximize productivity with HTML URL List Downloader. Quickly extract URLs.
- **Endpoint:** `POST /api/v1/seo/link-extractor`
- **Mechanism:** DOM parsing using Cheerio, fetching all `href` tags.
- **Request Payload:**
```json
{
  "url": "https://www.example.com",
  "internal_only": false
}
```
- **Response Data Schema:**
```json
{
  "total_links": 45,
  "internal_links": ["https://www.example.com/about"],
  "external_links": ["https://twitter.com/example"]
}
```

### 5.4 Apple Store Api
- **Description:** Discover the "Apple Store API"! Unlock the power of the Apple Store.
- **Endpoint:** `POST /api/v1/apps/app-store-scraper`
- **Mechanism:** iTunes Search API / scraping iTunes web pages.
- **Request Payload:**
```json
{
  "app_id": "123456789",
  "country": "us"
}
```
- **Response Data Schema:**
```json
{
  "app_name": "Cool Game",
  "developer": "Dev Studio",
  "price": "Free",
  "rating": 4.6,
  "reviews": 120500,
  "icon_url": "..."
}
```

### 5.5 Epicurious Recipes Scraper
- **Description:** Extract detailed recipes, ingredients, and instructions.
- **Endpoint:** `POST /api/v1/food/epicurious-scraper`
- **Mechanism:** Next.js JSON Data Extraction (`__NEXT_DATA__`).
- **Request Payload:**
```json
{
  "recipe_url": "https://www.epicurious.com/recipes/food/views/pasta"
}
```
- **Response Data Schema:**
```json
{
  "title": "Best Pasta Ever",
  "ingredients": ["1 lb pasta", "2 cups sauce"],
  "steps": ["Boil water", "Add pasta"],
  "rating": 4.9
}
```

### 5.6 FireScrape AI Website Content Markdown Scraper
- **Description:** Extracts website content, converts it to Markdown, and structures it for LLM.
- **Endpoint:** `POST /api/v1/ai/firescrape-markdown`
- **Mechanism:** Puppeteer -> Readability.js -> Turndown (Markdown conversion).
- **Request Payload:**
```json
{
  "url": "https://en.wikipedia.org/wiki/Web_scraping"
}
```
- **Response Data Schema:**
```json
{
  "title": "Web scraping - Wikipedia",
  "markdown": "# Web scraping\nWeb scraping is data scraping used for extracting data...",
  "token_count_estimate": 1200
}
```

### 5.7 Google Play Api
- **Description:** Explore apps, get details, similar apps, search.
- **Endpoint:** `POST /api/v1/apps/google-play-scraper`
- **Mechanism:** Google Play Store internal JSON batch endpoints reverse engineering.
- **Request Payload:**
```json
{
  "package_name": "com.example.app",
  "lang": "en"
}
```
- **Response Data Schema:**
```json
{
  "title": "Example App",
  "installs": "10,000,000+",
  "score": 4.2,
  "description": "...",
  "developer": {"name": "Example Corp", "email": "dev@example.com"}
}
```

### 5.8 Power Data Transformer
- **Description:** Clean, merge, split, deduplicate, filter, validate scraped data.
- **Endpoint:** `POST /api/v1/data/transformer`
- **Mechanism:** Python Pandas / SQL in memory (DuckDB).
- **Request Payload:**
```json
{
  "dataset": [{"id": 1, "name": " JOHN "}, {"id": 1, "name": "JOHN"}],
  "operations": ["trim", "deduplicate"]
}
```
- **Response Data Schema:**
```json
{
  "processed_dataset": [{"id": 1, "name": "JOHN"}]
}
```

### 5.9 Youtube Transcript Scraper - Caption, Subtitles
- **Description:** Scrape transcripts, captions, subtitles from Youtube videos.
- **Endpoint:** `POST /api/v1/youtube/transcript-advanced`
- **Mechanism:** Reverse engineering YouTube `timedtext` API with auto-translation support.
- **Request Payload:**
```json
{
  "video_url": "https://www.youtube.com/watch?v=XYZ123",
  "target_language": "fr"
}
```
- **Response Data Schema:**
```json
{
  "translated": true,
  "subtitles_srt": "1\n00:00:00,500 --> 00:00:02,000\nBonjour le monde"
}
```

### 5.10 Czech News Scraper
- **Description:** Extracts articles from Czech news sites in JSON.
- **Endpoint:** `POST /api/v1/news/czech-scraper`
- **Mechanism:** XML RSS feed parsing + Cheerio HTML article extraction.
- **Request Payload:**
```json
{
  "site": "novinky.cz",
  "limit_articles": 10
}
```
- **Response Data Schema:**
```json
{
  "articles": [
    {
      "headline": "...",
      "published_at": "2023-10-25T10:00:00Z",
      "author": "Pavel Novak",
      "content": "Full text of the article..."
    }
  ]
}
```

## 6. API Services 41 to 50

### 6.1 Dice.com FULL Job Scraper
- **Description:** Scrapes job listings from Dice.com, handles pagination, keyword search, filters.
- **Endpoint:** `POST /api/v1/jobs/dice-scraper`
- **Mechanism:** Intercepting internal REST APIs / Algolia search endpoints used by Dice.
- **Request Payload:**
```json
{
  "search_query": "React Developer",
  "location": "Remote",
  "employment_type": "contract"
}
```
- **Response Data Schema:**
```json
{
  "jobs": [
    {
      "job_id": "987654",
      "title": "Senior React.js Dev",
      "employer": "Tech Solutions LLC",
      "skills_required": ["React", "TypeScript", "Node.js"],
      "posting_date": "2023-10-24"
    }
  ]
}
```

### 6.2 Fast Indeed Job Scraper
- **Description:** High-speed solution for Indeed data. Target jobs with precision.
- **Endpoint:** `POST /api/v1/jobs/indeed-fast-scraper`
- **Mechanism:** Scrapy + Residential Datacenter Proxies (No JS execution for speed).
- **Request Payload:**
```json
{
  "direct_url": "https://www.indeed.com/jobs?q=python&l=austin"
}
```
- **Response Data Schema:**
```json
{
  "results_count": 15,
  "jobs": [
    {"title": "Python Developer", "salary_estimate": "$90K-$120K"}
  ]
}
```

### 6.3 LinkedIn Job Scraper (Lightweight)
- **Description:** Lightweight actor for scraping LinkedIn job listings. Clean dataset with minimal columns.
- **Endpoint:** `POST /api/v1/jobs/linkedin-lite`
- **Mechanism:** HTTP requests to Voyager API (guest mode).
- **Request Payload:**
```json
{
  "job_title_query": "Product Manager",
  "location": "Berlin, Germany"
}
```
- **Response Data Schema:**
```json
{
  "jobs": [
    {
      "Job Title": "Product Manager AI",
      "Company": "StartUp GmbH",
      "Location": "Berlin",
      "Job URL": "https://linkedin.com/jobs/view/123"
    }
  ]
}
```

### 6.4 Stepstone Job Scraper
- **Description:** Efficiently scraping job listings from Stepstone. Fast and simple.
- **Endpoint:** `POST /api/v1/jobs/stepstone-scraper`
- **Mechanism:** Headless Playwright traversing JSON-LD objects.
- **Request Payload:**
```json
{
  "keyword": "Engineer",
  "radius_km": 50
}
```
- **Response Data Schema:**
```json
{
  "title": "Mechanical Engineer",
  "company_name": "BuildCorp",
  "city": "Munich"
}
```

### 6.5 YouTube Video Heatmap Scraper
- **Description:** Extract viewer engagement hotspots from any YouTube video!
- **Endpoint:** `POST /api/v1/youtube/heatmap`
- **Mechanism:** YouTube internal `get_video_info` parsing.
- **Request Payload:**
```json
{
  "video_id": "XYZ123"
}
```
- **Response Data Schema:**
```json
{
  "heatmap_data": [
    {"start_time": 0, "end_time": 2.48, "intensity_score": 0.1},
    {"start_time": 10.0, "end_time": 12.48, "intensity_score": 1.0}
  ]
}
```

### 6.6 Adobe Stock Search Results Scraper
- **Description:** Scrape Thousands of Adobe Stock Assets. High-quality images, videos, full metadata.
- **Endpoint:** `POST /api/v1/stock/adobe-scraper`
- **Mechanism:** Adobe Stock internal API.
- **Request Payload:**
```json
{
  "query": "office meeting",
  "asset_type": "images",
  "limit": 100
}
```
- **Response Data Schema:**
```json
{
  "assets": [
    {
      "id": 123456,
      "title": "Business people shaking hands",
      "thumbnail_url": "...",
      "creator_id": 789
    }
  ]
}
```

### 6.7 ALL Social Media/WebScraper
- **Description:** Try to bring the best scraper to the store... Multi-platform scraper.
- **Endpoint:** `POST /api/v1/osint/universal-social-scraper`
- **Mechanism:** URL regex matching to route to specific microservices (Insta/X/TikTok).
- **Request Payload:**
```json
{
  "url": "https://twitter.com/elonmusk"
}
```
- **Response Data Schema:**
```json
{
  "platform": "twitter",
  "profile_data": {
    "handle": "elonmusk",
    "followers": 150000000,
    "bio": "..."
  }
}
```

### 6.8 9GAG Video Downloader – HD Quality, MP3 Audio
- **Description:** Download 9GAG videos & MP3s in HD! Extract titles/sizes.
- **Endpoint:** `POST /api/v1/9gag/downloader`
- **Mechanism:** Cheerio parsing `<video>` and `<source>` HTML tags.
- **Request Payload:**
```json
{
  "post_url": "https://9gag.com/gag/abc1234"
}
```
- **Response Data Schema:**
```json
{
  "title": "Funny cat jumping",
  "video_url_mp4": "https://img-9gag-fun.9cache.com/photo/abc1234_460sv.mp4",
  "upvotes": 12000
}
```

### 6.9 Indeed Jobs Scraper [RENTAL]
- **Description:** Rental - Fast and reliable Indeed Job Scraper! Extract job listings with advanced filters.
- **Endpoint:** `POST /api/v1/jobs/indeed-premium`
- **Mechanism:** Cloudflare bypassing headless browsers (undetected-chromedriver).
- **Request Payload:**
```json
{
  "query": "CEO",
  "experience_level": "executive"
}
```
- **Response Data Schema:**
```json
{
  "jobs": [{"title": "CEO", "company": "BigBank", "apply_link": "..."}]
}
```

### 6.10 Vimeo Video Scraper
- **Description:** Extract Vimeo video metadata: Resolutions, codecs, likes, comments, channels!
- **Endpoint:** `POST /api/v1/vimeo/video-scraper`
- **Mechanism:** Fetching player config and Vimeo GraphQL API.
- **Request Payload:**
```json
{
  "video_url": "https://vimeo.com/12345678"
}
```
- **Response Data Schema:**
```json
{
  "video_title": "Artistic Short",
  "likes_count": 450,
  "comments": [
    {"user": "Viewer1", "text": "Amazing!"}
  ],
  "available_resolutions": ["1080p", "720p", "540p"]
}
```
