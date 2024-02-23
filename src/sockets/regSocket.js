const regSockConnection = (io) => {
    io.of('/reg').on('connection', (sock) => {
        console.log('Подключение к сокету регистрации') 
    })
}
export default regSockConnection