FROM node
WORKDIR /app
COPY package.json /app
RUN npm install
COPY . /app
RUN npm run build
EXPOSE 5000
CMD ["npm","run", "start"]