import { MongoClient } from 'mongodb';

const url = 'mongodb://localhost:27017';
const dbName = 'WaveConnect';
const collectionName = 'users';

async function connectToDatabase() {
  const client = await MongoClient.connect(url);
  return client.db(dbName);
}

async function addUser(name, pass, email) {
  const db = await connectToDatabase();
  const collection = db.collection(collectionName);
  const result = await collection.insertOne({ name, pass, email });
  return result.insertedId;
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

export { addUser, findUser, updateUser };
