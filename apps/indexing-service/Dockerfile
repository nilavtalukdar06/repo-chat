FROM node:24-alpine

RUN apk add --no-cache git

WORKDIR /home/app

COPY main.sh ./
COPY src ./src
COPY package*.json ./
COPY eslint.config.js ./
COPY tsconfig.json ./
COPY tsup.config.ts ./

RUN npm pkg delete devDependencies.@repo/eslint-config devDependencies.@repo/typescript-config
RUN npm install
RUN npm run build

RUN chmod +x main.sh

ENTRYPOINT [ "./main.sh" ]
