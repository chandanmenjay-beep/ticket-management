FROM oven/bun:1
WORKDIR /app

# Copy all project files
COPY . .

# Install dependencies
RUN bun install

# Build client and server
RUN bun run build

# Start the unified server
CMD ["bun", "run", "start"]
