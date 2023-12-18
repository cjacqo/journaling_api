const express = require('express')
const app = express()
const morgan = require('morgan')
const mongoose = require('mongoose')
const Models = require('./models.js')
const fs = require('fs')
const path = require('path')

const Entries = Models.Entry
const Users = Models.User

mongoose.connect('mongodb://localhost:27017/journaling', { useNewUrlParser: true, useUnifiedTopology: true })

/**
 * ADD A USER
 * - Expected JSON Format:
 * {
 *    ID: Integer,
 *    FirstName: String,
 *    LastName: String,
 *    UserName: String,
 *    Password: String,
 *    Email: String,
 *    Entries: Array
 * }
 */
app.post('/users', async (req, res) => {
  await Users.findOne({ UserName: req.body.UserName })
    .then(user => {
      if (user) {
        return res.status(400).send(req.body.UserName + ' already exists')
      } else {
        Users.create({
          UserName: req.body.UserName,
          Password: req.body.Password,
          FirstName: req.body.FirstName,
          LastName: req.body.LastName,
          Email: req.body.Email
        })
        .then(user => { res.status(201).json(user) })
      .catch(err => {
        console.error(err)
        res.status(500).send('Error: ' + err)
      })
      }
    })
    .catch(err => {
      console.error(err)
      res.status(500).send('Error: ' + err)
    })
})

// list for requests
app.listen(8080, () => {
  console.log('Your app is listening on port 8080')
})