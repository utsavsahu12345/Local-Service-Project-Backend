const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const multer = require("multer");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
dotenv.config();
const app = express();
app.use(
  cors({
    origin: [
      "http://localhost:5173","local-service-project-frontend-git-main-utsav-sahus-projects.vercel.app"
    ],
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

const User = require("./Mongodb/User");

const CustomerAuthRoutes = require('./routes/CustomerAuthRoutes');
const ServiceAuthRoutes = require('./routes/ServiceAuthRoutes');
const CustomerRoutes = require("./routes/CustomerRoutes");
const ServiceRoutes = require("./routes/ServiceRoutes");
const AdminAuthRoutes = require("./routes/AdminAuthRoutes");
const AdminRoutes = require("./routes/AdminRoutes");

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const storage = multer.memoryStorage();
const upload = multer({ storage });
// --- AUTH MIDDLEWARE ---

app.get("/", (req, res) => {
  res.send("Backend is running ✅");
});

app.use('/customer/auth', CustomerAuthRoutes);
app.use('/service/auth', ServiceAuthRoutes);
app.use('/customer', CustomerRoutes);
app.use('/service', ServiceRoutes);
app.use('/admin/auth', AdminAuthRoutes);
app.use('/admin', AdminRoutes);

app.get("/me", (req, res) => {
  try {
    const token = req.cookies.token; // ✅ httpOnly cookie
    if (!token) return res.status(401).json({ message: "No token found" });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ message: "User data fetched", payload }); // payload me username aur email etc.
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;  
  try {
    // 🔍 Find user by username or email
    const user = await User.findOne({
      $or: [{ username }, { email: username }],
    });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }
    if (user.block) {
      return res
        .status(403)
        .json({ message: "Your account is blocked. Please contact support." });
    }
    // 🔒 Compare password (plain for now)
    if (user.password !== password) {
      return res.status(400).json({ message: "Invalid password" });
    }
    // ✅ Create JWT token
    const token = jwt.sign(
      {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        username: user.username,
        gender: user.gender,
        location: user.location,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    // ✅ Set token in cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // true only in production
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });
    // ✅ Send success response
    return res.status(200).json({
      message: "Login successful!",
      role: user.role,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// logout.js or in main server file
app.post("/logout", (req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    expires: new Date(0), // expire immediately
    sameSite: "lax",
    secure: false, // production me true
  });
  res.json({ message: "Logged out successfully" });
});

app.post("/signup", async (req, res) => {
  try {
    const { fullName, username, email, password, gender, location } = req.body;

    // Check existing user
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already exists" });

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Create user
    const newUser = new User({
      fullName,
      username,
      email,
      password,
      gender,
      location,
      otp,
      verified: false,
      role: "Customer",
    });

    await newUser.save();

    // Send OTP mail
    await transporter.sendMail({
      from: process.env.EMAIL,
      to: email,
      subject: "Email Verification OTP",
      text: `Your OTP is: ${otp}`,
    });

    res.json({ message: "OTP sent to email", userId: newUser._id });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/signup/verify-otp", async (req, res) => {
  const { userId, otp } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(400).json({ message: "User not found" });

    if (user.otp === otp) {
      user.verified = true;
      user.otp = null;
      await user.save();

      // Create JWT token
      const token = jwt.sign(
        {
          id: user._id,
          fullName: user.fullName,
          username: user.username,
          email: user.email,
          gender: user.gender,
          location: user.location,
          role: user.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      // Set token in cookies
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 24 * 60 * 60 * 1000,
      });

      res.json({
        message: "Email verified successfully",
        user: {
          fullName: user.fullName,
          username: user.username,
          email: user.email,
          gender: user.gender,
          location: user.location,
          role: user.role,
        },
        token,
      });
    } else {
      return res.status(400).json({ message: "Invalid OTP" });
    }
  } catch (err) {
    console.error("OTP Verify Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
