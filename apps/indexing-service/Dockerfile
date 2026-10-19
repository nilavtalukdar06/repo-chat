FROM node:24-alpine

RUN apk add --no-cache git

WORKDIR /home/app

COPY main.sh ./
COPY ca.pem ./
COPY src ./src
COPY prisma ./prisma
COPY prisma7.config.ts ./
COPY package*.json ./
COPY eslint.config.js ./
COPY tsconfig.json ./
COPY tsup.config.ts ./

RUN npm pkg delete devDependencies.@repo/eslint-config devDependencies.@repo/typescript-config
RUN npm install
RUN npx prisma generate
RUN npm run build

RUN chmod +x main.sh

ENTRYPOINT [ "./main.sh" ]
