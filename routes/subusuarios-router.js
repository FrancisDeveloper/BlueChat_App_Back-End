//Invocamos express
const express = require('express')
const router = express.Router();

router.get('/', (req, res) => {
    res.send('Lista de sub usuarios')
})
router.get('/:id', (req, res) => {
    res.send('Ver sub usuario')
})
router.post('/register', (req, res) => {
    res.send('Registro de sub usuario')
})
router.put('/edit/:id', (req, res) => {
    res.send('Editar sub usuario')
})
router.delete('/delete/:id', (req, res) => {
    res.send('Eliminar 1 sub-usuario')
})


module.exports = router