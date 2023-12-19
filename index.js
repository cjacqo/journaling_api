const mongoose = require('mongoose')
const Models = require('./models.js')
const Entries = Models.Entry
const Users = Models.User

mongoose.connect('mongodb://127.0.0.1/journaling')

const express = require('express'),
app = express(),
bodyParser = require('body-parser'),
path = require('path'),
morgan = require('morgan')

app.use(morgan('common'))
app.use(express.static(path.join(__dirname, 'public')))
app.use(bodyParser.json())

let auth = require('./auth')(app)

const passport = require('passport')
require('./passport.js')

const cors = require('cors')
let allowedOrigins = [
  'https://localhost:8080'
]

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    if (allowedOrigins.indexOf(origin) === -1) {
      // If a specific origin isn't found on the list of allowed origins
      let message = 'The CORS policy for this application doesn\'t allow access from origin ' + origin
      return callback(new Error(message), false)
    }
    return callback(null, true)
  }
}))

const { check, validationResult } = require('express-validator') 

/**
 * @description Home Page
 * @example
 * Authentication: None
 * @name GET /
 */
app.get('/', (req, res) => {
  res.send('Welcome to my API for journaling!')
})

/**
 * @description List of Users
 * @example
 * Authentication: None
 * @name GET /users
 */
app.get('/users', async (req, res) => {
  await Users.find()
    .then((users) => {
      res.status(201).json(users)
    })
    .catch((err) => {
      console.error(err)
      res.status(500).send('Error: ' + err)
    })
})

/**
 * @description Create a User
 * @name POST /users
 * @example
 * Authentication: None
 * @example
 * Request data format
 * {
 *  "FirstName": String,
 *  "LastName": String,
 *  "UserName": String,
 *  "Password": String,
 *  "Email": String
 * }
 * @example
 * Response data format
 * {
 *  "FirstName": String,
 *  "LastName": String,
 *  "UserName": String,
 *  "Password": String,
 *  "Email": String,
 *  "Entries": [ObjectID]
 * }
 */
app.post('/users', async (req, res) => {
  // Hash the new user's password
  let hashedPassword = Users.hashPassword(req.body.Password)
  await Users.findOne({ UserName: req.body.UserName })
    .then((user) => {
      if (user) {
        return res.status(400).send(req.body.UserName + ' already exists')
      } else {
        Users.create({
          FirstName: req.body.FirstName,
          LastName: req.body.LastName,
          UserName: req.body.UserName,
          Password: hashedPassword,
          Email: req.body.Email
        })
        .then((user) => { res.status(201).json(user) })
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

/**
 * @description Get a User by UserName
 * @name GET /users/:UserName
 * @example
 * Authentication: Bearer token (JWT)
 * @example
 * Request data format
 * {
 *  "UserName": String
 * }
 * @example
 * Response data format
 * {
 *  "_id": ObjectID,
 *  "FirstName": String,
 *  "LastName": String,
 *  "UserName": String,
 *  "Password": String,
 *  "Email": String,
 *  "Entries": [ObjectID]
 * }
 */
app.get(
  '/users/:UserName',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    await Users.findOne({ UserName: req.params.UserName })
      .then((user) => {
        if (!user) {
          res.status(400).send(req.params.UserName + ' was not found')
        } else {
          res.json(user)
        }
      })
      .catch((err) => {
        console.error(err)
        res.status(500).send('Error: ' + err)
      })
})

/**
 * @description Update a User
 * @name PUT /users/:UserName
 * @example
 * Authentication: Bearer token (JWT)
 * @example
 * Request data format
 * {
 *  "UserName": String,
 *  "Password": String,
 *  "Email": String
 * }
 * @example
 * Response data format
 * {
 *  "_id": ObjectID,
 *  "FirstName": String,
 *  "LastName": String,
 *  "UserName": String,
 *  "Password": String,
 *  "Email": String,
 *  "Entries": [ObjectID]
 * }
 */
app.put(
  '/users/:UserName',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    // CONDITION TO CHECK USER.USERNAME !== PARAMS.USERNAME
    if (req.user.UserName !== req.params.UserName) {
      return res.status(400).send('Permission denied')
    }
    try {
      // Check if the new username already exists in the db
      const existinguser = await Users.findOne({ UserName: req.body.UserName })

      if (existinguser) {
        return res.status(400).send(req.body.UserName + ' already exists')
      }

      await Users.findOneAndUpdate({ UserName: req.params.UserName }, {
        $set:
        {
          UserName: req.body.UserName,
          Password: req.body.Password,
          Email: req.body.Email
        }
      },
      { new: true })
      .then((updatedUser) => {
        res.json(updatedUser)
      })
      .catch((err) => {
        console.error(err)
        res.status(500).send('Error: ' + err)
      })
    } catch (err) {
      console.error(err)
      res.status(500).send('Error: ' + err)
    }
})

/**
 * @description Delete a User by UserName
 * @name DELETE /users/:UserName
 * @example
 * Authentication: Bearer token (JWT)
 * @example
 * Request data format:
 * {
 *  "UserName": String
 * }
 * @example
 * Response data format:
 * none
 */
app.delete(
  '/users/:UserName',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    await Users.findOneAndDelete({ UserName: req.params.UserName })
      .then((user) => {
        if (!user) {
          res.status(400).send(req.params.UserName + ' was not found')
        } else {
          res.status(200).send(req.params.UserName + ' was deleted')
        }
      })
      .catch((err) => {
        console.error(err)
        res.status(500).send('Error: ' + err)
      })
})

/**
 * @description Insert Entry into Users List of Entries by UserName
 * @name POST /users/:UserName/Entries/:EntryID
 * @example
 * Authentication: Bearer token (JWT)
 * @example
 * Request data format:
 * {
 *  "UserName": String
 * }
 * @example
 * Response data format:
 * none
 */
app.post(
  '/users/:UserName/Entries/:EntryID',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    await Users.findOneAndUpdate({ UserName: req.params.UserName }, {
      $push: { Entries: req.params.EntryID }
    },
    { new: true })
    .then((updatedUser) => {
      res.json(updatedUser)
    })
    .catch((err) => {
      console.error(err)
      res.status(500).send('Error: ' + err)
    })
})

/**
 * @description List of Entries
 * @example
 * Authentication: Bearer token (JWT)
 * @name GET /entries
 */
app.get('/entries', passport.authenticate('jwt', { session: false }), async (req, res) => {
  await Entries.find()
    .then((entries) => {
      res.status(201).json(entries)
    })
    .catch((err) => {
      console.error(err)
      res.status(500).send('Error: ' + err)
    })
})

/**
 * CREATE AN ENTRY
 */
app.post('/entries', async (req, res) => {
  await Entries.findOne({ Title: req.body.Title })
    .then((entry) => {
      if (entry) {
        return res.status(400).send(req.body.Title + ' already exists')
      } else {
        Entries.create({
          Title: req.body.Title,
          Content: req.body.Content
        })
        .then((entry) => { res.status(201).json(entry) })
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

/**
 * UPDATE ENTRY BY TITLE
 */
app.put('/entries/:Title', async (req, res) => {
  await Entries.findOneAndUpdate({ Title: req.params.Title }, { $set:
    {
      CreatedAt: new Date(),
      Title: req.body.Title,
      Content: req.body.Content
    }
  },
  { new: true })
  .then((updateEntry) => {
    res.json(updateEntry)
  })
  .catch((err) => {
    console.error(err)
    res.status(500).send('Error: ' + err)
  })
})

/**
 * DELETE ENTRY BY TITLE
 */
app.delete('/entries/:Title', async (req, res) => {
  await Entries.findOneAndDelete({ Title: req.params.Title })
    .then((entry) => {
      if (!entry) {
        res.status(400).send(req.params.Title + ' was not found')
      } else {
        res.status(200).send(req.params.Title + ' was deleted')
      }
    })
    .catch((err) => {
      console.error(err)
      res.status(500).send('Error ' + err)
    })
})

// list for requests
app.listen(8080, () => {
  console.log('Your app is listening on port 8080')
})