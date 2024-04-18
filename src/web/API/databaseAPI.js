import { MongoClient } from 'mongodb';

const url = 'АДРЕС БАЗЫ ДАННЫХ';
const dbName = 'WaveConnect';
const collectionName = 'users';

async function connectToDatabase() {
  const client = await MongoClient.connect(url);
  return client.db(dbName);
}

async function addUser(name, password, email) {
  const db = await connectToDatabase();
  const collection = db.collection(collectionName);
  const result = await collection.insertOne({ password, email, name });
  return result.insertedId;
}

async function addUserFields(name, status, bio, avatarLink, username){
  const db = await connectToDatabase();
  const collection = db.collection(collectionName);
  await collection.updateOne(
    {'name': name},
    {'$set': {status, bio, avatarLink, username}}
  )
};

async function getUserAvatarLink(name){
  const db = await connectToDatabase();
  const collection = db.collection(collectionName);
  const user = await collection.findOne({'name': name}); // использовать findOne вместо find
  return user ? user.avatarLink : null; // Проверяем, что пользователь найден, и возвращаем avatarLink, если пользователь существует
}



async function findUser(name) {
  const db = await connectToDatabase();
  const collection = db.collection(collectionName);
  const cell = await collection.findOne({ name });
  return cell;
}

async function updateUser(name, newData) {
  const db = await connectToDatabase();
  const collection = db.collection(collectionName);
  const result = await collection.updateOne({ name }, { $set: { data: newData } });
  return result.modifiedCount > 0;
}

export { addUser, findUser, updateUser, addUserFields, getUserAvatarLink };
