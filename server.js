import express from 'express'
import path from 'path'


import { fileURLToPath } from 'url'
import { dirname } from 'path'
import {createServer} from 'http'
import { Server } from 'socket.io'

const __dirname = dirname(fileURLToPath(import.meta.url))

import loginRoute from './src/routes/loginRoute.js'
import chatRoute from './src/routes/chatRoute.js'
import settingsRoute from './src/routes/settingsRoute.js'
import regRoute from './src/routes/regRoute.js'

const app = express()
const server = createServer(app)
const io = new Server(server)

import loginSocket from './src/sockets/loginSocket.js'
import chatSocket from './src/sockets/chatSocket.js'
import regSocket from './src/sockets/regSocket.js'
import settingsSocket from './src/sockets/settingsSocket.js'

regSocket(io)
chatSocket(io)
loginSocket(io)
settingsSocket(io)
const staticUrl = 'http://ВАШ АЙПИ/reg';

app.use(express.static(path.join(__dirname, 'src', 'web')));

app.use('/reg', regRoute);
app.use('/login', loginRoute);
app.use('/chat', chatRoute);
app.use('/settings', settingsRoute);

// Redirect root requests to the static URL
app.get('/', (req, res) => {
    res.redirect(staticUrl);
});

server.listen(8080, () => {
    console.log('Сервер запущен');
});
