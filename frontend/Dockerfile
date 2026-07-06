# Frontend Dockerfile - Vite/React Development
FROM node:20-alpine

WORKDIR /app

# Install dependencies first for caching
COPY package*.json ./
RUN npm install

# Copy the rest of the files
COPY . .

EXPOSE 5173

# Ensure node_modules are present and start the dev server
CMD ["sh", "-c", "npm install && npm run dev -- --host"]
