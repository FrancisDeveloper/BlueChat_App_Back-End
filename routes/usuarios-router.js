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
//invocar a bcryptjs
const bcryptjs = require('bcryptjs');
//Variable de session
const session = require('express-session')
router.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}))
//Invocamos el modulo de conexión que creamos en database/db.js para conectarnos a la base de datos
const connection = require('./../database/db')



//Registración
router.post('/register', async (req, res) => {
    const sql = 'INSERT INTO usuarios SET ?';

    let verificarSubUsuario = req.body.sub_user
    let subUsuario;
    if(verificarSubUsuario == undefined){
        subUsuario = 0
    }else{
        subUsuario = verificarSubUsuario
    }

    let password = req.body.password
    let passwordSinEncriptar = '';

    if((typeof password) === 'number'){
        passwordSinEncriptar = `${password}`
    }else{
        passwordSinEncriptar = password
    }

    let passwordEncrypted = await bcryptjs.hash(passwordSinEncriptar, 8)
    const objUsuario = {
        nombre: req.body.nombre,
        apellido: req.body.apellido,
        usuario: req.body.usuario,
        email: req.body.email,
        password: passwordEncrypted,
        country_code: req.body.country_code,
        number: req.body.number,
        rol: req.body.rol,
        sub_user: subUsuario
    }

    connection.query(sql, objUsuario, error =>{
        if(error) throw error
        res.send({
            status: 'registrado',
            message: 'Usuario principal registrado con exito!'
        })
        //todo enviar JSON al front indicando que el registro se ha completado con sweetAlert y un paramero que confirme y redireccione al usuario al /login
    })
})

//Autenticación
router.post('/auth', async (req, res) => {
    let usuario = req.body.usuario;
    let password = req.body.password
    let passwordSinEncriptar = '';

    if((typeof password) === 'number'){
        passwordSinEncriptar = `${password}`
    }else{
        passwordSinEncriptar = password
    }

    let passwordEncrypted = await bcryptjs.hash(passwordSinEncriptar, 8);

    if((usuario && passwordSinEncriptar)){
        connection.query('SELECT * FROM usuarios WHERE usuario = ?', [usuario], async (error, resultados) => {
            if(resultados.length === 0 || !(await bcryptjs.compare(passwordSinEncriptar, resultados[0].password))){
                res.send({
                    status: "Usuario y/o contraseña no validos"
                })
            }else{
                req.session.loggedIn = true;
                req.session.nombre = resultados[0].nombre

                //todo generar el token para enviarlo al front
                res.send(resultados)
                //todo enviar JSON al front indicando que el login se ha completado con sweetAlert y un paramero que confirme y redireccione al usuario al /dashboard
            }
        })
    }else{
        res.send('favor completar los campos primero')
    }
})

//Obtener 1 usuario
router.get('/usuarios/:id', (req, res) => {
    const usuarioId = req.params.id;
    connection.query(`SELECT * FROM usuarios WHERE id = ${usuarioId}`, (error, resultados) => {
        if(error) throw error
        res.send(resultados)
    })
})

//Cerrar sesion
router.get('/logout', (req, res) => {
    req.session.destroy(()=>{
        res.send('Ha cerrado sesión')
        //todo enviar JSON al front indicando que se ha cerrado sesion con un paramero que confirme y redireccione al usuario al /login
    })
})

module.exports = router