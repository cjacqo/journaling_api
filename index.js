const mongoose = require('mongoose')
const Models = require('./models.js')
const Entries = Models.Entry
const Users = Models.User

// mongoose.connect('mongodb://127.0.0.1/journaling')
mongoose.connect(process.env.CONNECTION_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
 })

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
app.post('/users',
  [
    check("UserName", "Username is required").isLength({ min: 5 }),
    check(
      "UserName",
      "Username contains non alphanumberic characters - not allowed"
    ).isAlphanumeric(),
    check("Password", "Password must be between 8 and 20 characters").isLength({
      min: 8,
      max: 20
    }),
    check("Password", "Password is required").not().isEmpty(),
    check("Email", "Email does not appear to be valid").isEmail()
  ],
  async (req, res) => {
    let errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() })
    }
    await Users.findOne({ UserName: req.body.UserName })
      .then((user) => {
        if (user) {
          return res.status(400).send(req.body.UserName + ' already exists')
        } else {
          Users.create({
            FirstName: req.body.FirstName,
            LastName: req.body.LastName,
            UserName: req.body.UserName,
            Password: Users.hashPassword(req.body.Password),
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
app.get('/users/:UserName',
  [
    check("UserName", "Username is required").isLength({ min: 5 }),
    check(
      "UserName",
      "Username contains non alphanumberic characters - not allowed"
    ).isAlphanumeric(),
  ],
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
app.put('/users/:UserName',
  [
    check("UserName", "Username is required").isLength({ min: 5 }),
    check(
      "UserName",
      "Username contains non alphanumberic characters - not allowed"
    ).isAlphanumeric(),
    check("Password", "Password must be between 8 and 20 characters").isLength({
      min: 8,
      max: 20
    }),
    check("Password", "Password is required").not().isEmpty(),
    check("Email", "Email does not appear to be valid").isEmail()
  ],
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
app.delete('/users/:UserName',
  [
    check("UserName", "Username is required").isLength({ min: 5 }),
    check(
      "UserName",
      "Username contains non alphanumberic characters - not allowed"
    ).isAlphanumeric(),
  ],
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      // Get the user id
      const userId = req.user.id

      // Delete the user's account
      await Users.findOneAndDelete({ _id: userId, UserName: req.params.UserName })
        .then(user => {
          if (!user) {
            res.status(400).send('Permission denied')
          } else {
            res.status(200).send(req.params.UserName + ' was deleted')
          }
        })
    } catch (err) {
      console.error(err)
      res.status(500).send('Error: ' + err)
    }
})

/**
 * @description List of Entries
 * @example
 * Authentication: Bearer token (JWT)
 * @name GET /entries
 */
app.get('/entries',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      // Get the user id
      const userId = req.user._id
      
      // Get the user
      const user = await Users.findById(userId)

      // Find the entries based on ObjectID
      const entries = await Entries.find({
        _id: { $in: user.Entries }
      })

      // Return the entries
      return res.status(200).json(entries)
    } catch (err) {
      console.error(err)
      res.status(500).send('Error: ' + err)
    }
})

/**
 * @description Create an Entry
 * @example
 * Authentication: Bearer token (JWT)
 * @name POST /entries
 */
app.post('/entries',
  [
    check("Title", "Title is required").isLength({ min: 5 }),
    check(
      "Title",
      "Title contains non alphanumberic characters - not allowed"
    ).isAlphanumeric(),
    check("Content", "Content must be between 8 and 500 characters").isLength({
      min: 8,
      max: 500
    }),
    check("Content", "Content is required").not().isEmpty()
  ],
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const { Title, Content } = req.body

    try {
      // Get user id
      const userId = req.user._id

      // Get the user
      const user = await Users.findById(userId)
        .populate('Entries')
        .then(user => {
          if (!user) {
            return res.status(404).send('User not found')
          }
          return user
        })

      // Filter User.Entries to see if Title already exists
      const hasDuplicateTitle = user.Entries.some(entry => entry.Title === Title)
      
      // Check if Title already exists
      if (hasDuplicateTitle) {
        return res.status(400).send(`'${Title}' already exists`)
      } else {
        // Create new entry
        const newEntry = new Entries({
          Title,
          Content,
          Author: userId
        })

        // Save the entry
        await newEntry.save()

        // Update the user's Entries field with the new entry's ObjectID
        await Users.findByIdAndUpdate(userId, {
          $push: { Entries: newEntry._id }
        })

        return res.status(201).json(newEntry)
      }
    } catch (err) {
      console.error(err)
      res.status(500).send('Error: ' + err)
    }
})

/**
 * @description Update an Entry
 * @example
 * Authentication: Bearer token (JWT)
 * @name PUT /entries/:Title
 */
app.put('/entries/:Title',
  [
    check("Title", "Title is required").isLength({ min: 5 }),
    check(
      "Title",
      "Title contains non alphanumberic characters - not allowed"
    ).isAlphanumeric(),
    check("Content", "Content must be between 8 and 500 characters").isLength({
      min: 8,
      max: 500
    }),
    check("Content", "Content is required").not().isEmpty()
  ],
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    // Get title from params
    const { Title } = req.params
    
    try {
      // Get user id
      const userId = req.user._id

      // Get the user and populate Entries
      const user = await Users.findById(userId)
        .populate('Entries')
        .then(user => {
          if (!user) {
            return res.status(404).send('User not found')
          }
          return user
        })
      
      // Find the entry with the same title
      const entry = user.Entries.find(entry => entry.Title === Title)

      // Check if entry exists
      if (!entry) {
        return res.status(400).send(`Entry with title '${Title}' was not found`)
      }

      // Filter User.Entries to see if Title already exists
      const hasDuplicateTitle = user.Entries.some(entry => entry.Title === req.body.Title)
      
      // Check if Title already exists
      if (hasDuplicateTitle) {
        return res.status(400).send(`'${req.body.Title}' already exists`)
      }

      // Find entry in Entries collection
      await Entries.findOneAndUpdate({ Title: Title, Author: userId }, {
        $set:
        {
          Title: req.body.Title,
          Content: req.body.Content
        }
      },
      { new: true })
      .then((updatedEntry) => {
        res.json(updatedEntry)
      })
      .catch((err) => {
        console.error(err)
        res.status(500).send('Error: ' + err)
      })
    } catch (err) {
      console.error(err)
      res.status(400).send('Error: ' + err)
    }
})

/**
 * @description
 * @example
 * Authentication: Bearer token (JWT)
 * @name DELETE /entries/:Title
 */
app.delete('/entries/:Title',
  [
    check("Title", "Title is required").isLength({ min: 5 }),
    check(
      "Title",
      "Title contains non alphanumberic characters - not allowed"
    ).isAlphanumeric(),
  ],
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    // Get title from params
    const { Title } = req.params
    
    try {
      // Get user id
      const userId = req.user._id
      
      // Get the user
      const user = await Users.findById(userId)
        .populate('Entries')
        .then(user => {
          if (!user) {
            return res.status(404).send('User not found')
          }
          return user
        })

      // Find entry with given title in User.Entries
      const entry = user.Entries.find(entry => entry.Title === Title)

      // Check if entry exists
      if (!entry) {
        return res.status(400).send(`Entry with title '${Title}' was not found`)
      }

      // Get entry id
      const entryId = entry._id

      // Delete from Entries collection
      await Entries.findByIdAndDelete(entryId)

      // Delete from Users Entries field
      await Users.findByIdAndUpdate(userId, {
        $pull: {
          Entries: entryId
        }
      }).then(() => {
        console.log('Entry deleted successfully from the User document')
      }).catch((err) => {
        console.error('Error deleting entry from User document: ' + err)
      })

      return res.status(200).send(Title + ' was found and deleted')
      
    } catch (err) {
      console.error(err)
      res.status(400).send('Error: ' + err)
    }
})

// listen for requests
const port = process.env.PORT || 8080
app.listen(port, '0.0.0.0', () => {
  console.log(`Listening on Port: ${port}`)
})

// app.listen(8080, () => {
//   console.log('Your app is listening on port 8080')
// })