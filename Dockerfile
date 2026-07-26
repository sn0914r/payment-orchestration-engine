FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./

# DEVELOPMENT STAGE
FROM base AS development
RUN npm install
COPY . .
CMD ["npm", "run", "dev"]

# BUILD STAGE
FROM base AS build
RUN npm install
COPY . .
RUN npm run build

# PRODUCTION STAGE
FROM base AS production
ENV NODE_ENV=production
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY docs ./docs
CMD ["npm", "start"]