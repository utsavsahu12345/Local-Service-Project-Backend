const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema({
  username: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: Number, required: true },
  service: { type: String, required: true },
  experience: { type: Number, required: true },
  description: { type: String, required: true },
  location: { type: String, required: true },
  visitingPrice: { type: Number, required: true },
  maxPrice: { type: Number, required: true },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  approve: { type: String, enum: ["reject", "approve", "pending"], default: "pending" },
  image: {
    data: { type: Buffer, required: true },
    contentType: { type: String, required: true }
  }
});

module.exports = mongoose.model("ServiceAdd", serviceSchema, "ServicesAdd");
