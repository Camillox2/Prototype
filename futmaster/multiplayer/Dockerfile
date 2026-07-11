FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY multiplayer ./multiplayer
ENV PORT=8787
EXPOSE 8787
CMD ["node","multiplayer/server.mjs"]
