import nodemailer from 'nodemailer';
import {addUser} from '../web/API/databaseAPI.js'

const transporter = nodemailer.createTransport({
  host: 'smtp.mail.ru',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: 'Ваш EMAIL',
    pass: 'Пароль от вашего EMAIL'
  }
});

function generateRandomCode() {
  let code = '';
  for (let i = 0; i < 6; i++) {
      code += Math.floor(Math.random() * 10); 
  }
  return code;
}

const regSockConnection = (io) => {
    io.of('/reg').on('connection', (sock) => {
    
        const generatedCode = generateRandomCode()

        console.log('Подключение к сокету регистрации') 
        sock.on('checkMail', (email) => {
            console.log(generatedCode)
            console.log('Емейл для проверки: ' + email)
            const mailOptions = {
              from: 'wavesender@mail.ru',
              to: email,
              subject: 'Код регистрации',
              text: 'Ваш код регистрации: ' + generatedCode + ', никому не сообщайте его! Спасибо, что выбрали нас.'
            }

            transporter.sendMail(mailOptions, (err, info) => {
              if(err){
                console.log('Ошибка отправки письма: ' + err)
              }else{
                console.log('Отправка письма на адрес ' + email + ' удалась: ' + info.response)
              }
            })
            sock.emit('validateCode', generatedCode)
           
        })
        sock.on('checkingCode', (enteredCode) => {
          var isTrue
          if(generatedCode == enteredCode){
            console.log('Коды совпали')
            isTrue = true
            sock.emit('checkedCode', true)
          }
          else{
            isTrue = false
            sock.emit('checkedCode', false)
          }
        })
        sock.on('saveUser', (name, pass, email) => {
          console.log(`Получен запрос на регистрацию нового юзера: имя - ${name}, пароль - ${pass}, почта - ${email}`)
          try{
            addUser(name, pass, email)
            console.log('Юзер успешно добавлен в БД')
            console.log(`Данные юзера: имя=${name}, почта=${email}, пароль=${pass}`)
          }
          catch(err){
            console.log('Ошибка при добавлении юзера в БД: ' + err)
          }
        })
    })

}
export default regSockConnection;
