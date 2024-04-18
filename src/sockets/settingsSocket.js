import fs from 'fs';
import path from 'path';
import process from 'process';
import { authenticate } from '@google-cloud/local-auth';
import { google } from 'googleapis';

import {addUserFields} from '../web/API/databaseAPI.js'
import { log } from 'console';

const date = new Date()

const SCOPES = ['https://www.googleapis.com/auth/drive'];
const TOKEN_PATH = path.join(process.cwd(), '/src/sockets/googleAppData/token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), '/src/sockets/googleAppData/credentials.json');

async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.promises.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

async function saveCredentials(client) {
  try {
    const content = await fs.promises.readFile(CREDENTIALS_PATH);
    const keys = JSON.parse(content);
    const key = keys.installed || keys.web;
    const payload = JSON.stringify({
      type: 'authorized_user',
      client_id: key.client_id,
      client_secret: key.client_secret,
      refresh_token: client.credentials.refresh_token,
    });
    await fs.promises.writeFile(TOKEN_PATH, payload);
  } catch (err) {
    console.error('Ошибка при сохранении учетных данных:', err);
    throw err; 
  }
}

async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (!client) {
    client = await authenticate({
      scopes: SCOPES,
      keyfilePath: CREDENTIALS_PATH,
    });
    await saveCredentials(client);
  }
  return client;
}

async function uploadBasic(photoPath, photoName) {
  const authClient = await authorize();

  const requestBody = {
    name: photoName,
    fields: 'id',
  };

  const media = {
    mimeType: 'image/jpeg',
    body: fs.createReadStream(path.join(process.cwd(), photoPath)),
  };

  try {
    const service = google.drive({ version: 'v3', auth: authClient });
    const file = await service.files.create({
      requestBody,
      media,
    });

    // Определяем права доступа к файлу
    const fileId = file.data.id;
    const permissionRequest = {
      fileId: fileId,
      requestBody: {
        role: 'reader', // Разрешаем только чтение
        type: 'anyone', // Любой, у кого есть ссылка, может просматривать файл
      },
    };

    // Добавляем права доступа к файлу
    await service.permissions.create(permissionRequest);

    console.log('File Id:', fileId);
    return fileId;
  } catch (err) {
    throw err;
  }
}


const settingsSockConnection = (io) => {
  io.of('/settings').on('connection', (sock) => {
    console.log('[Settings]: Подключение к сокету');
    sock.on('testEmit', async (data) => {
      const { username, status, bio, base64Image, imageExtension, uName} = data; 
      const filename = `${username}_${date.getDay()}_${date.getHours()}_${date.getMinutes()}.${imageExtension}`
      console.log('Загрузка файла с именем: ' + filename);
      const buffer = Buffer.from(base64Image, 'base64');
      const pathTemp = 'src/temp_image/' + filename
      await fs.writeFile(path.join(process.cwd(), pathTemp), buffer, (err) => {
        if (err) {
          console.error('[Settings]: Ошибка при сохранении изображения: ' + err);
        } else {
          console.log('[Settings]: Изображение временно сохранено');
        }
      uploadBasic(pathTemp, filename)
      .then(fileId => {
        console.log('[Settings]: Изображение  успешно загружено с ID:', fileId);
        const avatarLink = `https://drive.google.com/thumbnail?id=${fileId}`
        console.log(`[Settings]: В документ с полем name=${uName}, занесены поля: status=${status}, bio=${bio}, avatarLink=${avatarLink}, username=${username} `);
        addUserFields(uName, status, bio, avatarLink, username);
        console.log('[Settings]: Введенные поля занесены в базу данных')
      })
      .catch(err => {
        console.error('[Settings]: Ошибка загрузки изображения:', err);
      });
      });
    });

  });
  
};

export default settingsSockConnection;
