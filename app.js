import http from 'http';
import path, { join } from 'path';
import { readFile } from 'fs';
import express from 'express';
import TelegramBot from 'node-telegram-bot-api';
import jwt from 'jsonwebtoken';
import formidable from 'formidable';


const Bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const SERVER_PORT = process.env.PORT || '3000';
const JWT_SECRET = process.env.JWT_SECRET;

Bot.on('polling_error', (err) => console.error(err));

Bot.onText(new RegExp(/\/help/i), (msg) => {
  const rsp = `
    Hello! I'm here to help
    /chatId -> get the current chat id
  `
  Bot.sendMessage(msg.chat.id, rsp);
});

Bot.onText(new RegExp(/\/chatId/i), (msg) => {
  Bot.sendMessage(msg.chat.id, `The current channel Id is ${msg.chat.id}`);
})

Bot.onText(new RegExp(/\bbot\b/i), (msg) => {
  Bot.sendMessage(msg.chat.id, 'Hi, I\'m your friendly :robot:  assistant, if you need help just type /help !');
});

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(join(path.resolve(''), 'public')));

const getFileData = async (req) => {
  const form = formidable({ multiples: true });

  return new Promise((res, rej) => {
    form.parse(req, (err, fields, files) => {
      if (err) rej(err);
      try {
        readFile(files.snap.path, (e, data) => {
          if (e) rej(e);
          res(data);
        });
      } catch (ex) {
        rej(ex);
      }
    });
  });
};

app.post('/pic', async (req, res, next) => {
  const token = req.get('token') || null;

  if (!token) {
    res.status(401).send();
    console.warn(`Unauthorized request from ${req.ip}`);
    return;
  }

  try {
    jwt.verify(token, JWT_SECRET);
  } catch (ex) {
    res.status(401).send();
    console.error(`Invalid token ${token} provided`);
    return;
  }

  try {
    const fdata = await getFileData(req);
    Bot.sendMessage(CHAT_ID, 'Incoming snapshot:');
    Bot.sendPhoto(CHAT_ID, fdata);
    res.status(201).send('ok');
  } catch (ex) {
    Bot.sendMessage(CHAT_ID, '⚠️ Error getting snapshot information');
    console.error(ex);
    res.status(500).send(ex);
  }

});

app.set('port', SERVER_PORT);

const server = http.createServer(app);
server.listen(SERVER_PORT);
server.on('error', (error) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  switch (error.code) {
    case 'EACCES':
      console.error(`${SERVER_PORT} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`${SERVER_PORT} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
});

server.on('listening', () => {
  console.info(`Listening on ${SERVER_PORT}`);
});
