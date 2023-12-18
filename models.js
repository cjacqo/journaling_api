const mongoose = require('mongoose')

let entrySchema = new mongoose.Schema({
  CreatedAt: { type: Date, default: Date.now },
  Title: { type: String, required: true },
  Content: { type: String, required: true },
  Author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
})

let userSchema = new mongoose.Schema({
  FirstName: { type: String, required: true },
  LastName: { type: String, required: true },
  UserName: { type: String, required: true },
  Password: { type: String, required: true },
  Email: { type: String, required: true },
  Entries: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Entry' }]
})

let Entry = mongoose.model('Entry', entrySchema, 'entries')
let User = mongoose.model('User', userSchema, 'users')

module.exports = {
  Entry,
  User
}