# Forensic Scraping API Gateway

This project is a high-performance, modular API gateway built with **Next.js App Router** and **Turborepo**. It hosts 50 distinct scraping and data-extraction APIs designed using **DRY** and **SOLID** principles.

## 🚀 Quick Start (Local Setup)

Follow these steps to configure and run the repository locally on your machine.

### Prerequisites

1. **Node.js**: Ensure you have Node.js version 18+ installed. You can check your version by running:
   `node -v`
2. **Git**: Ensure Git is installed to clone the repository.

### Step 1: Clone the Repository

Clone the project to your local machine and navigate into the root directory:

`git clone https://github.com/your-username/your-repo-name.git`
`cd your-repo-name`


### Step 2: Install Dependencies

This project uses `npm` workspaces via Turborepo. Install all root and sub-package dependencies by running:

`npm install`


### Step 3: Build Core Libraries

Before running the API Gateway, you need to build the shared libraries (such as `packages/scraping-core`). Turborepo handles this automatically:

`npm run build`


### Step 4: Run the Development Server

Start the local development server for the Next.js API Gateway:

`npm run dev`


Alternatively, to start the production-optimized build:
`npm run start --workspace=apps/api-gateway`

The server will start on `http://localhost:3000`.

### Step 5: Test an API Endpoint

Once the server is running, you can test one of the endpoints using `curl`, Postman, or your browser.

Example using `curl` to test the 9GAG downloader API:

```bash
curl -X POST http://localhost:3000/api/v1/9gag/downloader \
  -H "Content-Type: application/json" \
  -d '{"post_url": "https://9gag.com/gag/aOQQp12"}'
```

You should receive a standardized JSON response:
```json
{
  "success": true,
  "data": {
    "title": "Example Post",
    "media_type": "image",
    "image_url": "...",
    "upvotes": 1234
  }
}
```

---

## 🏗️ Architecture Overview

Please refer to the [FORENSIC_ARCHITECTURE_REPORT.md](./FORENSIC_ARCHITECTURE_REPORT.md) for a deep dive into:
- The Monorepo Structure (`apps/`, `packages/`).
- The DRY/SOLID core (`withScrapingHandler`, `stealthGet`).
- Deployment strategies for Vercel (Free) and Render.com Docker (Free).
- CI/CD Configurations using GitHub Actions.

