FROM node:alpine

COPY . /VRC_WSMMS_WS
WORKDIR /VRC_WSMMS_WS

RUN yarn
EXPOSE 9000

CMD ["node", "index.js"]
