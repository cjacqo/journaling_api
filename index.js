const express = require('express')
const app = express()
const morgan = require('morgan')
const mongoose = require('mongoose')
const Models = require('./models.js')
const fs = require('fs')
const path = require('path')



// list for requests
app.listen(8080, () => {
  console.log('Your app is listening on port 8080')
})