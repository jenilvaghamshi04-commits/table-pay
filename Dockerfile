FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=10000 DATA_DIR=/var/data
RUN mkdir -p /var/data && chown node:node /var/data
COPY --chown=node:node package.json index.html ./
COPY --chown=node:node app-server ./app-server
COPY --chown=node:node drizzle ./drizzle
USER node
EXPOSE 10000
CMD ["node", "app-server/node.mjs"]
