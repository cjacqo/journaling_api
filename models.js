const mongoose = require('mongoose')

let entrySchema = mongoose.Schema({
  CreatedAt: {
    type: Date,
    default: Date.now
  },
  Title: { type: String, required: true },
  Content: { type: String, required: true }
})

let userSchema = mongoose.Schema({
  FirstName: { type: String, required: true },
  LastName: { type: String, required: true },
  UserName: { type: String, required: true },
  Password: { type: String, required: true },
  Email: { type: String, required: true },
  Entries: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Entry' }]
})