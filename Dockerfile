# Base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
# Using npm install to ensure devDependencies (tsx) are installed
RUN npm install

# Copy source code
COPY . .

# Environment variables must be set in the deployment platform (HF Spaces)

# Expose port (HF expects 7860)
EXPOSE 7860

# Start Bot
CMD ["npm", "run", "bot:telegram"]
