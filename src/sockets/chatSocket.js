import { MongoClient } from 'mongodb';
import { ObjectId } from 'mongodb';
import mongoose from 'mongoose';

import {getUserAvatarLink} from '../web/API/databaseAPI.js'

const url = 'АДРЕС БАЗЫ ДАННЫХ'; // URL для подключения к базе данных
const dbNamePrefix = 'Chat_'; // Префикс для базы данных чата

async function connectToDatabase(chatName) {
  const client = await MongoClient.connect(url);
  const db = client.db(dbNamePrefix + chatName);
  return db;
}

const chatSockConnection = (io) => {
  io.of('/chat').on('connection', (sock) => {
    console.log('Подключение к сокету чата');

    let currentChatDb = null;
    // Обработчик создания чата
    sock.on('createChat', async (data) => {
        const { firstUser, secondUser } = data
        const chatName = `${firstUser}_${secondUser}`
        console.log('Создание чата')
        currentChatDb = await connectToDatabase(chatName)
        const chatsCollection = currentChatDb.collection('chats');
        await chatsCollection.insertOne({ name: chatName, users: {firstUser, secondUser} });
        console.log('Чат создан')
        sock.emit('loa')
    })

    sock.on('loadChats', async name => {
      const client = new MongoClient(url);
      try {
          await client.connect();
  
          const adminDb = client.db().admin();
  
          const databaseNames = await adminDb.listDatabases();
  
          for (const database of databaseNames.databases) {
              if (database.name.startsWith('Chat_')) {
                  const db = client.db(database.name)
                  const collection = db.collection('chats')
  
                  const chat = await collection.findOne({ $or: [{ "users.firstUser": name }, { "users.secondUser": name }] });
                  if (chat) {
                      console.log(`Найден чат, в котором участвует пользователь ${name}`);
                      if(name == chat.users.firstUser){
                        sock.emit('loadChat', chat.users.secondUser)
                      }
                      else{
                        sock.emit('loadChat', chat.users.firstUser)
                      }

                  }
              }
          }
      } finally {
          await client.close();
      }
  });
  

    // Обработчик подключения к чату
    sock.on('join', async (data) => {
      const { chatName, userName } = data;
      const client = new MongoClient(url);

      try {
        // Перебор баз данных чатов
        const dbList = await client.db().admin().listDatabases();
        const userRegex = new RegExp(userName);
        let foundChatName = null;
    
        for (const db of dbList.databases) {
          if (userRegex.test(db.name)) {
            foundChatName = db.name;
            const chatRegex = new RegExp(chatName);
            if(chatRegex.test(foundChatName)){
              console.log(foundChatName);

              currentChatDb = client.db(foundChatName);
              const chatsCollection = currentChatDb.collection('chats');
          
              // Проверка существования чата в базе данных
              const existingChat = await chatsCollection.findOne({ name: chatName });
              if (!existingChat) {
                await chatsCollection.insertOne({ name: chatName });
              }
          
              // Получение сообщений из базы данных при подключении
              const messagesCollection = currentChatDb.collection('messages');
              const messages = await messagesCollection.find().toArray();
          
              // Отправка извлеченных сообщений клиенту
              messages.forEach(async message => {
                try {
                  const avatarLink = await getUserAvatarLink(message.name);
                  sock.emit('loadMessage', { username: message.name, message: message.mess, date: message.date, _id: message._id, edited: message.edited, avatarLink });
                } catch (error) {
                  console.error('Ошибка при получении ссылки на аватар:', error);
                  sock.emit('loadMessage', { username: message.name, message: message.mess, date: message.date, _id: message._id, edited: message.edited, avatarLink: null });
                }
              });
            }
          }
        }
    
        if (!foundChatName) {
          console.error('Чат с таким именем не найден');
          return;
        }
    
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
        const insertResult = await messagesCollection.insertOne({ name, mess, date, edited: false });
        const insertedMessageId = insertResult.insertedId
        console.log('Добавление даты в БД: ' + date)
        console.log('Айди сообщения:' + insertedMessageId)

        getUserAvatarLink(name).then(avatarLink => {
          io.of('/chat').emit('chatMessage', { username: name, message: mess, chatNameForSend: chatName, time: date, _id: insertResult.insertedId, edited: false, avatarLink });
        }).catch(err => {
          console.log(err)
        })

        // Отправка нового сообщения всем клиентам

      } catch (error) {
        console.error('Ошибка при добавлении сообщения в базу данных:', error);
      }
    });

    sock.on('editMessage', async (data) => {
      const { messageId, newMess, chatName } = data
      console.log('тип MESSAGEID: ' + typeof messageId)
      console.log('Значение поля MESSAGEID._ID: ' + messageId)
      try {
        // Проверяем, подключен ли клиент к какому-либо чату
        if (!currentChatDb) {
          console.error('Ошибка: клиент не подключен к чату');
          return;
        }
        const messagesCollection = currentChatDb.collection('messages');
        const editResult = messagesCollection.updateOne(
          { "_id": new ObjectId(messageId) },
          { "$set": { mess: newMess } }
        );
        editResult.then(result => {
          if (result.modifiedCount > 0) {
              console.log('Значение было успешно обновлено.');

              messagesCollection.updateOne(
                {"_id": new ObjectId(messageId)},
                {"$set": {edited: true}})

              io.of('chat').emit('messageEdited', { messageId: messageId, newMess: newMess })

          } else {
              console.log('Значение не было обновлено.');
          }
      }).catch(error => {
          console.error('Произошла ошибка при обновлении значения:', error);
      });

      } catch (error) {
        console.error('Ошибка при редактировании сообщения в базе данных:', error);
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
