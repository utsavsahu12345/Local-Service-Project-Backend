const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, default: "Service" },
  block: { type: Boolean, default: false },
  verified: { type: Boolean, default: false },
  otp: { type: String }, 
});

module.exports = mongoose.model("ServiceUser", userSchema, "ServiceLogin");
