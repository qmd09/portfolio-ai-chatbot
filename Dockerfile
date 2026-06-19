FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
# npm ci is faster and strictly respects the lockfile — safer for production builds
RUN npm ci

COPY . .

# Run as a non-root user — container security best practice
RUN addgroup -S app && adduser -S app -G app
USER app

EXPOSE 3001
CMD ["npm", "run", "proxy"]
