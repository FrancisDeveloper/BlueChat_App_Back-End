//Invocamos express
const express = require('express')
const router = express.Router();

//invocamos las dependencias del modulo
//seteamos urlencoded para capturar los datos del formulario
router.use(express.urlencoded({extended:false}))
router.use(express.json())
//invocamos a dotenv
const dotenv = require('dotenv');
dotenv.config({path: './env/.env'})
//Variable de session
const session = require('express-session')
router.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}))
//Invocamos el modulo de conexión que creamos en database/db.js para conectarnos a la base de datos
const connection = require('./../database/db')

//Invocamos las dependencias del cliente de WhatsApp
const SESSION_FILE_PATH = process.env.SESSION_FILE_PATH;
const fs = require('fs');
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const moment = require('moment');
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: SESSION_FILE_PATH
    })
});
let isOnline = false
let clientStatusData = {
    status: '',
    qr_code: ''
}

const withSession = () => {
    client.on('ready', ()=>{
        console.log('Haz iniciado sesion con una sesion guardada')
    })

    client.on('auth_failure', () => {
        console.log('Hubo un fallo en la autenticación (Elimina la carpeta session.js)');
    })

    client.initialize();
}
//Este funcion genera el QR Code
const withOutSession = (clientParams) => {
    clientStatusData.status = 'initialized'
    clientStatusData.qr_code = ''

    client.on('qr', qr => {
        let qr_code = qrcode.generate(qr, { small: true });

        clientStatusData.status = 'qr'
        clientStatusData.qr_code = qr_code
    });

    client.on('authenticated', ()=>{
        clientStatusData.status = 'authenticated'
        clientStatusData.qr_code = ''

        console.log('Haz iniciado sesion por primera vez')
    })

    client.on('ready', ()=>{
        isOnline = true
        clientStatusData.status = 'ready'
        clientStatusData.qr_code = ''

        console.log('El Cliente esta READY') //todo enviar un aviso al front de que el cliente está autenticado y listo
    })

    client.on('auth_failure', () => {
        isOnline = false
        clientStatusData.status = 'auth_failure'
        clientStatusData.qr_code = ''

        console.log('Hubo un fallo en la autenticación (Elimina la carpeta session.js)');
    })

    client.initialize();
}


//verificación
router.get('/isonline', (req, res) => {
    if(isOnline){
        res.send({
            status: 'online'
        })
    }else{
        res.send({
            status: 'offline'
        })
    }
})

router.post('/initialize', (req, res) =>{
    //Revisar si existe una sesion
    (fs.existsSync(SESSION_FILE_PATH)) ? withSession() : withOutSession();
    res.send(clientStatusData)
})

router.post('/qr', (req, res) =>{

    res.send()
})















module.exports = router