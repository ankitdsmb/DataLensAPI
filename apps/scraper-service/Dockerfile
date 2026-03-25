FROM node:18-bullseye-slim

# Install latest chrome dev package and fonts to support major charsets (Chinese, Japanese, Arabic, Hebrew, Thai and a few others)
# Note: this installs the necessary libs to make the bundled version of Chromium that Puppeteer installs, work.
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \
    && sh -c 'echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-khmeros fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to skip installing Chrome. We'll be using the installed package.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

WORKDIR /usr/src/app

# Since we are in a monorepo, we need to copy the root package.json and the workspace package.json
# Note: In a real Turborepo setup you might use `turbo prune` to create a pruned workspace,
# but for a simple npm workspaces Dockerfile, we copy everything.
COPY package*.json ./
COPY turbo.json ./
COPY apps/scraper-service/package.json ./apps/scraper-service/
COPY packages/ ./packages/

# Install dependencies for the workspace
RUN npm install

# Copy the rest of the app source code
COPY apps/scraper-service/ ./apps/scraper-service/

# Build the project if necessary (assuming a build step exists)
# RUN npm run build --workspace=apps/scraper-service

# Run as non-root user
USER node

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD [ "npm", "start", "--workspace=apps/scraper-service" ]
