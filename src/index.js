//Invocamos express
import express, {response} from 'express'
import {Server as WebSocketServer} from 'socket.io'
import http from 'http'
const connection = require('./../database/db')
const bcryptjs = require("bcryptjs")
const app = express();
const server = http.createServer(app)
//require('events').EventEmitter.defaultMaxListeners = 0; //TODO TRABAJANDO EN ERROR DE LISTENER MEMORY LEAK ---- EDIT: [SOLUCIONADO]

//invocamos a dotenv
require('dotenv').config();

//Configurando CORS Y LOS ORIGENES
const cors = require('cors')
const whiteList = [process.env.WHITELIST]
const io = new WebSocketServer(server, {
    cors:{
        origin: whiteList
    }
})

//Invocamos las dependencias del cliente de WhatsApp
const SESSION_FILE_PATH = process.env.SESSION_FILE_PATH;
const fs = require('fs');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const moment = require('moment');
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: SESSION_FILE_PATH
    })
});

let ws_data = {
    status: 'no_initialized',
    qr_code: ''
}

//Esta es la ruta que va a servir la API
app.use(express.static(__dirname + './../public'))

//Eliminar la carpeta sesion cuando el servidor arranque
if(fs.existsSync(SESSION_FILE_PATH)){
    fs.rmSync(SESSION_FILE_PATH, { recursive: true })
}

//Creando y utilizando los eventos de WebSocket
io.on('connection', (socket)=>{
    //---EVENTOS PARA LOGIN
    const authListener = (data) =>{
        let usuario = data.usuario
        let password = data.password
        if((usuario && password)){
            connection.query(`SELECT * FROM usuarios WHERE usuario = '${usuario}'`, async (error, resultados) => {
                if(resultados === undefined){
                    let loginData = {
                        status: 'login_fail',
                        message: 'Usuario y/o contraseña no validos'
                    }
                    socket.emit('login_fail', loginData)
                }else if(resultados.length === 0 || !(await bcryptjs.compare(password, resultados[0].password))){
                    let loginData = {
                        status: 'login_fail',
                        message: 'Usuario y/o contraseña no validos'
                    }
                    socket.emit('login_fail', loginData)
                }else{
                    socket.emit('login_success', resultados[0])
                }
            })
        }else{
            let loginData = {
                status: 'login_fail',
                message: 'Por favor completar los campos de usuario y contraseña'
            }
            socket.emit('login_fail', loginData)
        }
    }
    socket.on('auth', (data)=>{
        authListener(data)
        socket.off('auth', authListener)
    })
    //---EVENTOS PARA REGISTRARSE
    const registerListener = (data) => {
        let registerData = {
            nombre: data.nombre,
            apellido: data.apellido,
            usuario: data.usuario,
            email: data.email,
            password: data.password,
            country_code: data.countryCode,
            number: data.number
        }
        const sql = 'INSERT INTO usuarios SET ?';
        connection.query(sql, registerData, error =>{
            if(error) throw error
            socket.emit('register_success')
        })
    }
    socket.on('register', (data)=>{
        registerListener(data)
        socket.off('register', authListener)
    })


    //----EVENTOS PARA INICIAR EL CLIENTE DE WHATSAPP
    let wsDataListener = () =>{
        socket.emit('send_ws_status', ws_data)
    }
    socket.on('get_ws_status', ()=>{
        wsDataListener()
        socket.off('get_ws_status', wsDataListener)
    })

    let wsInitializeListener = () =>{
        if(fs.existsSync(SESSION_FILE_PATH)){
            fs.rmSync(SESSION_FILE_PATH, { recursive: true })
        }
        setTimeout(withOutSession, 3000)
        ws_data = {
            status: 'initializing',
            qr_code: ''
        }
        socket.emit('ws_initializing', ws_data)
    }
    socket.on('ws_initialize', ()=>{
        wsInitializeListener()
        socket.off('ws_initialize', wsInitializeListener)
    })
    //-----------INICIAR EL CLIENTE DE WHATSAPP SIN UNA SESION GUARDADA
    const withOutSession = () => {
        client.on('qr', qr => {
            ws_data = {
                status: 'qr_sending',
                qr_code: qr
            }
            socket.emit('qr_code', ws_data)
        });

        client.on('authenticated', ()=>{
            ws_data = {
                status: 'authenticated',
                qr_code: ''
            }
            socket.emit('ws_authenticated', ws_data)
        })

        client.on('ready', ()=>{
            ws_data = {
                status: 'ws_ready',
                qr_code: ''
            }
            socket.emit('ws_ready', ws_data)

            listenMessage();
        })

        client.on('auth_failure', () => {
             ws_data = {
                status: 'auth_failure',
                qr_code: ''
            }
            socket.emit('ws_auth_failure', ws_data)
        })

        client.initialize();
    }

    //CERRAR SESION
    let wsDeleteListener = () => {
        ws_data = {
            status: 'ws_deleting',
            qr_code: ''
        }
        socket.emit('ws_deleting', ws_data)
        client.logout()
        ws_data = {
            status: 'no_initialized',
            qr_code: ''
        }
        setTimeout(()=>{
            socket.emit('ws_deleted', ws_data)
        },1500)
        setTimeout(()=>{
            if(fs.existsSync(SESSION_FILE_PATH)){
                fs.rmSync(SESSION_FILE_PATH, { recursive: true })
            }
        },3000)
    }
    socket.on('ws_delete', ()=>{
        wsDeleteListener()
        socket.off('ws_delete', wsDeleteListener)
    })
})

//---------------

//Esta funcion se encarga de escuchar todos los mensajes nuevos que lleguen
const listenMessage = () => {
    client.on('message', (message) => {
        const {from, to, body} = message;
        const who = 'EXTERNAL_USER'

        //PREGUNTAS FRECUENTES
        switch (body) {
            case 'Hola':
                sendMessage(from, 'Bienvenido a la Distribuidora la Diosa, estas interactuando con un Bot')
                //sendMedia(from, 'bot1.png')
                break;
        }
        saveHistorial(to, from, body, who);
    })
}
//Esta funcion se encarga de enviar mensajes
const sendMessage = (/*myNumber,*/ userNumber, message /*, who*/) => {
    client.sendMessage(userNumber, message)
    //saveHistorial(myNumber, userNumber, message, who);
}
const saveHistorial = (myNumber, userNumber, message, who) =>{
    const date = moment().format('YYYY-MM-DD HH:mm:ss')
    const miNumero = myNumber
    const usuarioNumero = userNumber
    const mensaje = message
    const autor = who
    const userId = 1
    const subUserId = ''

    const sql = 'INSERT INTO mensajes SET ?';
    const objMensaje = {
        remitente: usuarioNumero,
        receptor: miNumero,
        mensaje: mensaje,
        fecha: date,
        usuario_id: userId
    }
    connection.query(sql, objMensaje, error =>{
        if(error) throw error
        console.log('mensaje guardado en la db')
    })
}



//Accancando el servidor
server.listen(process.env.PORT || 3001)


//todo evitar el error que eparece cuando el usuario cierra la sesion desde el telefono
//todo remover listeners y/o revisar el re-renderizado tantas veces ---- EDIT: [SOLUCIONADO]











//Creamos las rutas genericas y especificas
/*
app.get('/', (req, res) => {
    res.send('Bienvenido a mi API')
})
app.get('/login', (req, res) => {
    res.send('Este es el Login')
})
app.get('/register', (req, res) => {
    res.send('Este es el Registro Principal')
})



//Invocamos los módulos de las rutas
const subusuariosRouter = require('./routes/subusuarios-router')
const usuariosRouter = require('./routes/usuarios-router')
const wsconfigRouter = require('./routes/wsconfig-router')

//Utilizamos las rutas externas
//módulo de rutas para los usuarios principales
app.use('/', usuariosRouter)

//módulo de rutas para los subusuarios
app.use('/subusuarios', subusuariosRouter)

//módulo de rutas para arrancar el cliente de WhatsApp
app.use('/wsconfig', wsconfigRouter)
 */