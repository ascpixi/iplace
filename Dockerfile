FROM node:lts AS base
WORKDIR /app

# By copying only the package.json and yarn.lock here, we ensure that the following `-deps` steps are independent of the source code.
# Therefore, the `-deps` steps will be skipped if only the source code changes.
COPY package.json yarn.lock ./

FROM base AS prod-deps
RUN yarn install --production --frozen-lockfile

FROM base AS build-deps
RUN yarn install --frozen-lockfile

FROM build-deps AS build
COPY . .
# Generate Prisma client
RUN yarn db:generate
RUN yarn build

FROM base AS runtime
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/prisma/generated ./src/prisma/generated

ENV HOST=0.0.0.0
ENV PORT=4321
EXPOSE 4321
CMD ["node", "./dist/server/entry.mjs"]
