const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  customerusername: { type: String, required: true },
  customername: { type: String, required: true },
  customeremail: { type: String, required: true },
  customeraddress: { type: String, required: true },
  customerphone: { type: Number, required: true },
  customerdate: { type: Date, required: true },
  customerdescription: { type: String, required: true },
  status: { type: String, enum: ["pending","confirm","completed","rejected","cancel"], default: "pending" },
  providerusername: { type: String, required: true },
  providername: { type: String, required: true },
  providerphone: { type: Number, required: true },
  service: { type: String, required: true },
  experience: { type: Number, required: true },
  providerdescription: { type: String, required: true },
  providerlocation: { type: String, required: true },
  visitingPrice: { type: Number, required: true },
  maxPrice: { type: Number, required: true },
  image: {
    data: { type: Buffer, required: true },
    contentType: { type: String, required: true },
  },
  feedback: { type: String },
  feedbackStatus: { type: Boolean, default: false },
  otp: { type: String }, // store OTP temporarily
  otpExpires: { type: Date }, 
});

module.exports = mongoose.model("Booking", bookingSchema);
