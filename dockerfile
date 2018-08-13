FROM node:boron
WORKDIR /app
COPY package.json /app
RUN npm install -g mugiwara
COPY . /app
CMD ["npm", "start"]