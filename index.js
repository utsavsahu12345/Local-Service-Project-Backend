// server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

dotenv.config();
const app = express();

// ------------------- CORS SETUP -------------------

app.use(cors({
  origin: true, 
  credentials: true,
}));

// ------------------- MIDDLEWARE -------------------
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// ------------------- MONGODB -------------------
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected ✅"))
  .catch((err) => console.error("MongoDB connection error:", err));

// ------------------- EMAIL SETUP -------------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// ------------------- ROUTES -------------------
app.get("/", (req, res) => {
  res.send("Backend is running ✅");
});

// --- AUTH ROUTES ---
const AuthRoutes = require("./routes/AuthRoutes");
const CustomerRoutes = require("./routes/CustomerRoutes");
const ServiceRoutes = require("./routes/ServiceRoutes");
const AdminRoutes = require("./routes/AdminRoutes");

app.use("/user", AuthRoutes);
app.use("/customer", CustomerRoutes);
app.use("/service", ServiceRoutes);
app.use("/admin", AdminRoutes);

// ------------------- GET CURRENT USER -------------------
app.get("/me", (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: "No token found" });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ message: "User data fetched", payload });
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
});

// ------------------- LOGOUT -------------------
app.post("/logout", (req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    expires: new Date(0),
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  res.json({ message: "Logged out successfully" });
});

// ------------------- START SERVER -------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} ✅`));
