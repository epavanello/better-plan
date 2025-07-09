# Stage 1: Build & Prune Dependencies
FROM node:20-slim AS build

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Install all dependencies to build the project
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy the rest of the application source code
COPY . .

# Ensure the migrations directory exists, even if no migrations have been generated yet
RUN mkdir -p migrations

# Set NODE_ENV to production for consistent builds
ENV NODE_ENV=production

# Build the application
# This will also compile the migration script
RUN pnpm build

# Prune dev dependencies by reinstalling only prod dependencies.
# This creates a clean `node_modules` folder to be copied to the final image.
RUN pnpm install --prod


# Stage 2: Production image
FROM node:20-slim AS production

WORKDIR /app

# Copy pruned production dependencies from the build stage
COPY --from=build /app/node_modules ./node_modules

# Copy the build output, including the compiled migration script
COPY --from=build /app/.output ./.output

# Copy migration scripts for Turso/SQLite
COPY --from=build /app/migrations ./migrations

# Create directory for local SQLite database (when not using Turso)
RUN mkdir -p /app/data && chmod 755 /app/data

# Expose the port the app runs on
EXPOSE 3000

# Set the command to start the server
ENV NODE_ENV=production
CMD ["node", ".output/server/index.mjs"] 