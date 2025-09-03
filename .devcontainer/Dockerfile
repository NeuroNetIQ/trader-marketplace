FROM node:20.11.0-bullseye

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    wget \
    unzip \
    postgresql-client \
    python3 \
    python3-pip \
    docker.io \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.14.0 --activate

# Install Supabase CLI
RUN npm install -g supabase@latest

# Install useful development tools
RUN npm install -g typescript tsx nodemon

# Create non-root user
RUN groupadd --gid 1000 node \
    && useradd --uid 1000 --gid node --shell /bin/bash --create-home node

# Switch to non-root user
USER node
WORKDIR /workspace

# Set up shell environment
RUN echo 'export PATH="/workspace/node_modules/.bin:$PATH"' >> ~/.bashrc
RUN echo 'alias ll="ls -la"' >> ~/.bashrc
RUN echo 'alias mp="/workspace/packages/marketplace-cli/bin/mp.js"' >> ~/.bashrc

# Default command
CMD ["sleep", "infinity"]
