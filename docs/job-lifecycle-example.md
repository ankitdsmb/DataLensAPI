# Job lifecycle example (submit → complete)

1. Client submits a tool request, for example:
   - `POST /api/v1/seo-tools/youtube-rank-checker`
2. API Gateway validates request body, creates a durable job record (`queued`), and returns:
   - `job.id`
   - `job.statusUrl` (`/api/v1/jobs/:jobId`)
   - `job.access.scope` (`public`, `authenticated`, or `submitter`)
3. API Gateway async runtime transitions job to `running` and dispatches execution to scraper-service:
   - `POST /jobs/execute`
4. scraper-service executes tool-specific work and returns:
   - `result`
   - `execution` metadata (`provider`, `browser`, `simulated`, `projection`, or `template`)
   - optional generated `artifacts`
5. API Gateway persists artifact payloads under `.data/jobs/artifacts`, updates job to `succeeded` (or `failed`), and sets completion timestamps.
6. Client polls `GET /api/v1/jobs/:jobId` until `status` is terminal:
   - `succeeded`, `failed`, or `expired`
7. Client can fetch persisted artifact content via:
   - `GET /api/v1/jobs/:jobId/artifacts/:artifactId`
