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

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true)
      if (allowedOrigins.indexOf(origin) === -1) {
        // If a specific origin isn't found on the list of allowed origins
        let message = 'The CORS policy for this application doesn\'t allow access from origin ' + origin
        return callback(new Error(message), false)
      }
      return callback(null, true)
    }
  })
)

app.get('/', (req, res) => {
  res.send('Welcome to my API for journaling!')
})

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
    .then((user) => {
      if (user) {
        return res.status(400).send(req.body.UserName + ' already exists')
      } else {
        Users.create({
          FirstName: req.body.FirstName,
          LastName: req.body.LastName,
          UserName: req.body.UserName,
          Password: req.body.Password,
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
 * GET ALL USERS
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
 * GET A USER BY USERNAME
 */
app.get('/users/:UserName', async (req, res) => {
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
 * UPDATE USER INFO BY USERNAME
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
app.put('/users/:UserName', async (req, res) => {
  await Users.findOneAndUpdate({ UserName: req.params.UserName }, { $set:
    {
      UserName: req.body.UserName,
      Password: req.body.Password,
      Email: req.body.Email
    }
  },
  { new: true }) // This line makes sure that the updated document is returned
  .then((updatedUser) => {
    res.json(updatedUser)
  })
  .catch((err) => {
    console.error(err)
    res.status(500).send('Error: ' + err)
  })
})

/**
 * DELETE A USER BY USERNAME
 */
app.delete('/users/:UserName', async (req, res) => {
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
 * ADD ENTRY TO A USER'S LIST OF ENTRIES
 */
app.post('/users/:UserName/Entries/:EntryID', async (req, res) => {
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
 * GET ALL ENTRIES
 */
// app.get('/entries', async (req, res) => {
//   await Entries.find()
//     .then((entries) => {
//       res.status(201).json(entries)
//     })
//     .catch((err) => {
//       console.error(err)
//       res.status(500).send('Error: ' + err)
//     })
// })
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