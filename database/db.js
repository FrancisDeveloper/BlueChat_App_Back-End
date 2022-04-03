const mysql = require('mysql')
require('dotenv').config();
const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
})

connection.connect((error)=>{
    if(error){
        console.log('El error de conexión es '+error)
        return;
    }
    console.log('Conexión a la base de datos exitosa!')
})

module.exports = connection