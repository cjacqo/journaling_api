const express = require('express')
const app = express()
const morgan = require('morgan')
const fs = require('fs')
const path = require('path')

let topBooks = [
  {
    title: 'Harry Potter and the Sorcerer\'s Stone',
    author: 'J.K. Rowling'
  },
  {
    title: 'Lord of the Rings',
    author: 'J.R.R. Tolkien'
  },
  {
    title: 'Twilight',
    author: 'Stephanie Meyer'
  }
]

const accessLogStream = fs.createWriteStream(path.join(__dirname, 'log.txt'), { flags: 'a' })
app.use(morgan('combined', { stream: accessLogStream }))

// GET requests
app.get('/', (req, res) => {
  res.send('Welcome to my book club!')
})

app.get('/documentation', (req, res) => {
  res.sendFile('documentation.html', { root: __dirname })
})

app.get('/books', (req, res) => {
  res.json(topBooks)
})

// list for requests
app.listen(8080, () => {
  console.log('Your app is listening on port 8080')
})