
const express = require('express')
const app = express()
const port = 3000

const { customParser } = require('./parser')

app.use(customParser)

app.get('/', (req, res) => {
    res.send('Hello World!')
})


app.post('/', (req, res) => {

    console.log(req.body);

    
    res.send('Hello World!')
})


app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})