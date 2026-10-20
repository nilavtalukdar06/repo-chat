FROM ubuntu:24.04

RUN apt-get update && \
    apt-get install -y curl git ca-certificates && \
    curl -fsSL https://deb.nodesource.com/setup_24.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

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
COPY .env ./

RUN npm pkg delete devDependencies.@repo/eslint-config devDependencies.@repo/typescript-config
RUN npm install
RUN npx prisma generate
RUN npm run build

RUN chmod +x main.sh

ENTRYPOINT [ "./main.sh" ]
