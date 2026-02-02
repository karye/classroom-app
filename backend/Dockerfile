FROM node:20-slim
WORKDIR /app
COPY package*.json ./
# Upgrade npm to latest
RUN npm install -g npm@latest && npm install --omit=dev && npm cache clean --force
COPY . .
EXPOSE 3000
CMD ["npm", "start"]