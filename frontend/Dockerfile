# Build stage
FROM node:20-alpine AS builder

ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy all files
COPY . .

# Build the React application for production
RUN npm run build

# Production stage
FROM nginx:1.25-alpine

# Copy nginx custom config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy static assets from build stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
