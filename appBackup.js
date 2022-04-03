const express = require('express');
const app = express();
const cors = require('cors')
if(process.env.NODE_ENV !== 'production'){
    require('dotenv').config();
}
const PORT = process.env.PORT || 3000;
const SESSION_FILE_PATH = process.env.SESSION_FILE_PATH;
const fs = require('fs');
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const exceljs = require('exceljs');
const moment = require('moment');
const {request, response} = require("express");
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: SESSION_FILE_PATH
    })
});


//Creando la API-------------------------
app.use(cors());
app.use(express.urlencoded({extended: true}))

const sendWithApi = (req, res) => {
    const { message, to } = req.body;
    const userNumber = `${to}@c.us`
    const myNumber = client.info.wid.user
    const who = 'SESION_USER'

    console.log(myNumber)
    console.log(message, to);

    sendMessage(myNumber, userNumber, message, who);

    res.send({
        status: 'Enviado'
    })
}
app.post('/send', sendWithApi)

const getWithApi = (req, res) => {
    const to = req.params;
    const newNumber = `${to.to}@c.us`
    function callback(resultados){
        res.json(resultados)
    }
    showHistorial(newNumber, callback);
}
app.get('/gethistorial/:to', getWithApi)




app.get('/', function (req, res) {
    res.send('root');
});
//-------------------------------------------------------

const withSession = () => {
    client.on('ready', ()=>{
        console.log('Haz iniciado sesion con una sesion guardada')
        listenMessage();
    })

    client.on('auth_failure', () => {
        console.log('Hubo un fallo en la autenticación (Elimina la carpeta session.js)');
    })

    client.initialize();
}
//Este funcion genera el QR Code
const withOutSession = () => {
    client.on('qr', qr => {
        qrcode.generate(qr, { small: true });
    });

    client.on('authenticated', ()=>{
        console.log('Haz iniciado sesion por primera vez')
    })

    client.on('auth_failure', () => {
        console.log('Hubo un fallo en la autenticación (Elimina la carpeta session.js)');
    })

    client.initialize();
}
//Esta funcion se encarga de escuchar todos los mensajes nuevos que lleguen
const listenMessage = () => {
    client.on('message', (message) => {
        const {from, to, body} = message;
        const who = 'EXTERNAL_USER'

        //PREGUNTAS FRECUENTES
        switch (body) {
            case 'hola':
                sendMessage(from, 'Bienvenido a la Distribuidora la Diosa, estas interactuando con un Bot')
                sendMedia(from, 'bot1.png')
                break;
        }
        console.log(to, from, body, who);
        saveHistorial(to, from, body, who);
    })
}
//Esta funcion se encarga de enviar mensajes
const sendMessage = (myNumber, userNumber, message, who) => {
    client.sendMessage(userNumber, message)
    saveHistorial(myNumber, userNumber, message, who);
}
//Esta funcion se encarga de enviar archivos multimedia
const sendMedia = (to, file) => {
    const mediaFile = MessageMedia.fromFilePath(`./mediaSend/${file}`)
    client.sendMessage(to, mediaFile)
}
//Esta funcion se encarga de guardar el historial para cada numero
const saveHistorial = (myNumber, userNumber, message, who) =>{
    const pathChat = `./chats/${userNumber}.xlsx`;
    const workbook = new exceljs.Workbook()
    const date = moment().format('DD-MM-YYYY hh:mm')
    let number;

    if(who === 'SESION_USER'){
        number = myNumber
    }else if(who === 'EXTERNAL_USER'){
        number = userNumber
        number = userNumber.replace(/@c.us/, '');
    }

    if(fs.existsSync(pathChat)){
        workbook.xlsx.readFile(pathChat)
            .then(()=>{
                const workSheet = workbook.getWorksheet(1);
                const lastRow = workSheet.lastRow;
                let getRowInsert = workSheet.getRow(++(lastRow.number));
                getRowInsert.getCell('A').value = date;
                getRowInsert.getCell('B').value = number;
                getRowInsert.getCell('C').value = message;
                getRowInsert.commit();
                workbook.xlsx.writeFile(pathChat)
                    .then(()=>{
                        console.log('Se agrego el mensaje al historial de este chat')
                    })
                    .catch(()=>{
                        console.log('Algo ha ocurrido al agregar el mensaje al historial')
                    })
                //---ESTA PARTE ES PARA LEET EL HISTORIAL COMPLETO Y MOSTRARLO EN CONSOLA
                /*
                workSheet.eachRow({ includeEmpty: true }, function(row, rowNumber) {
                    console.log("Row " + rowNumber + " = " + JSON.stringify(row.values));
                });
                 */
            })
    }else{
        const worksheet = workbook.addWorksheet('Chats')
        worksheet.columns = [
            { header: 'Fecha', key: 'date' },
            { header: 'Numero', key: 'number' },
            { header: 'Mensaje', key: 'message' }
        ]
        worksheet.addRow([date, number, message])
        workbook.xlsx.writeFile(pathChat)
            .then(()=>{
                console.log('Historial de Chat Creado!')
            })
            .catch(()=>{
                console.log('Algo ha fallado')
            })
    }
}
const showHistorial = async(number, fn) => {

    const pathChat = `./chats/${number}.xlsx`;
    const workbook = new exceljs.Workbook()


    if(fs.existsSync(pathChat)){
        await workbook.xlsx.readFile(pathChat)
        let jsonData = [];
        workbook.worksheets.forEach(function(sheet) {
            // read first row as data keys
            let firstRow = sheet.getRow(1);
            if (!firstRow.cellCount) return;
            let keys = firstRow.values;
            sheet.eachRow((row, rowNumber) => {
                if (rowNumber == 1) return;
                let values = row.values
                let obj = {};
                for (let i = 1; i < keys.length; i ++) {
                    obj[keys[i]] = values[i];
                }
                jsonData.push(obj);
            })
        });
        guardarResultados(jsonData)
    }else{
        let resultados = [];
        resultados.push('Aun no hay un historial disponible para este chat');
        guardarResultados(resultados)

        console.log('Aun no hay un historial disponible para este chat')
    }

    function guardarResultados(resultado){
        fn(resultado);
    }

//guardarResultados(resultados)

}

//Revisar si existe una sesion
(fs.existsSync(SESSION_FILE_PATH)) ? withSession() : withOutSession();






app.listen(PORT, () => {
    console.log(`El servidor está corriendo en el puerto ${PORT}`);
})