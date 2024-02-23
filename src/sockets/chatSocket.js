import { MongoClient } from 'mongodb';

const url = 'mongodb://localhost:27017';
const dbNamePrefix = 'Chat_'; // Префикс для базы данных чата

async function connectToDatabase(chatName) {
  const client = await MongoClient.connect(url);
  const db = client.db(dbNamePrefix + chatName);
  return db;
}

const chatSockConnection = (io) => {
  io.of('/chat').on('connection', (sock) => {
    console.log('Подключение к сокету чата');

    // Переменная для хранения базы данных текущего чата
    let currentChatDb = null;

    // Обработчик подключения к чату
    sock.on('join', async (chatName) => {
      try {
        // Подключение к базе данных для данного чата только один раз при подключении клиента
        currentChatDb = await connectToDatabase(chatName);

        // Создание коллекции чатов, если она не существует
        const chatsCollection = currentChatDb.collection('chats');

        // Проверка существования чата в базе данных
        const existingChat = await chatsCollection.findOne({ name: chatName });
        if (!existingChat) {
          // Если чат не существует, создаем запись о нем
          await chatsCollection.insertOne({ name: chatName });
        }

        // Получение сообщений из базы данных при подключении
        const messagesCollection = currentChatDb.collection('messages');
        const messages = await messagesCollection.find().toArray();
        // Отправка извлеченных сообщений клиенту
        messages.forEach(message => {
          sock.emit('loadMessage', { username: message.name, message: message.mess, date: message.date });
        });

      } catch (error) {
        console.error('Ошибка при подключении к базе данных чата:', error);
      }
    });

    // Обработчик новых сообщений от клиента
    sock.on('message', async (data) => {
      const { name, mess, chatName, date } = data;
      console.log(name + ', ' + mess + ' ' + date + ' ' + '| ЧАТ: ' + chatName);

      try {
        // Проверяем, подключен ли клиент к какому-либо чату
        if (!currentChatDb) {
          console.error('Ошибка: клиент не подключен к чату');
          return;
        }

        // Добавление нового сообщения в базу данных
        const messagesCollection = currentChatDb.collection('messages');
        await messagesCollection.insertOne({ name, mess, date });
        console.log('Добавление даты в БД: ' + date)

        // Отправка нового сообщения всем клиентам
        io.of('/chat').emit('chatMessage', { username: name, message: mess, chatNameForSend: chatName, time: date });

      } catch (error) {
        console.error('Ошибка при добавлении сообщения в базу данных:', error);
      }
    });

    // Обработчик отключения клиента от сокета
    sock.on('disconnect', () => {
      console.log('Клиент отключен от сокета чата');
      currentChatDb = null; // Сбрасываем текущую базу данных при отключении клиента
    });
  });
};

export default chatSockConnection;
