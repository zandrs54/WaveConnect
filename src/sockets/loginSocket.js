import {addUser, findUser, updateUser} from '../web/API/databaseAPI.js'
const loginSockConnection = (io) => {
    io.of('/login').on('connection', (sock) => {
        console.log('Подключение к сокету авторизации') 
        sock.on('getData', (data) => {
            const username = data.loginName
            const password = data.loginPassword
            findUser(username)
                .then(user => {
                    console.log(`Имя пользователя в БД: ${user.name}, пароль: ${user.password}, _id: ${user._id}`)
                    if(user != null){
                        console.log('Имя пользователя = ' +  user.name)
                        if(password === user.password){
                            console.log('Пароли совпадают = ' + user.password)
                            sock.emit('getData', ({
                                'checkName': true,
                                'checkPass': true
                            }))
                        }
                        else{
                            console.log('Пароли не совпадают: ' + password + ' != ' + user.password)
                            sock.emit('getData', ({
                                'checkName': true,
                                'checkPass': false
                            }))
                        }
                    }
                    else{
                        console.log('Имя пользователя не совпадает')
                        sock.emit('getData', ({
                            'checkName': false,
                            'checkPass': true
                        }))
                    }
                })
                .catch(err => {
                    console.log('Ошибка:', err)
                })
        })

    })
}
export default loginSockConnection