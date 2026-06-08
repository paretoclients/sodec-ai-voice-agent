FROM node:22-bookworm-slim AS base
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/admin/package.json apps/admin/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build -w @sodec/shared
RUN npm run build -w @sodec/api

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=base /app/package.json /app/package-lock.json ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/apps/api ./apps/api
COPY --from=base /app/packages/shared ./packages/shared
COPY --from=base /app/prisma ./prisma

EXPOSE 3000
CMD ["npm", "run", "start", "-w", "@sodec/api"]

