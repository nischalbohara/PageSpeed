FROM mcr.microsoft.com/playwright:v1.41.0-jammy

WORKDIR /tests

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy test code
COPY . .

# Default command
CMD ["npx", "playwright", "test"]
