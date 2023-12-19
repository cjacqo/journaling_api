const mongoose = require('mongoose')
const bcrypt = require('bcrypt')

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

userSchema.statics.hashPassword = password => {
  return bcrypt.hashSync(password, 10)
}

userSchema.methods.validatePassword = function(password) {
  return bcrypt.compareSync(password, this.password)
}

let Entry = mongoose.model('Entry', entrySchema, 'entries')
let User = mongoose.model('User', userSchema, 'users')

module.exports = {
  Entry,
  User
}