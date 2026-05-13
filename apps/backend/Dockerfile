FROM node:24.14.0-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run db:generate

EXPOSE 3000

CMD ["npm", "run", "dev"]
