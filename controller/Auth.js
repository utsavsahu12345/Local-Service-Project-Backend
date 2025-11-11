const jwt = require('jsonwebtoken');
const User = require('../Mongodb/User');
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// app.post("/login", 
const Login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({
      $or: [{ username }, { email: username }],
    });

    if (!user) return res.status(400).json({ message: "User not found" });
    if (user.block) return res.status(403).json({ message: "Your account is blocked." });

    // Compare plain text password
    if (user.password !== password) {
      return res.status(400).json({ message: "Invalid password" });
    }

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

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

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
};

// app.post("/signup", 
const Signup = async (req, res) => {
  try {
    const { fullName, username, email, password, gender, location, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email already exists" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const newUser = new User({
      fullName,
      username,
      email,
      password, // plain text (you can later hash it)
      gender,
      location,
      otp,
      verified: false,
      role,
    });

    await newUser.save();

    await transporter.sendMail({
      from: process.env.EMAIL,
      to: email,
      subject: "Email Verification OTP",
      text: `Your OTP is: ${otp}`,
    });

    res.json({ message: "OTP sent to email", userId: newUser._id });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ------------------- VERIFY OTP -------------------
// app.post("/signup/verify-otp", 
const SignupVerify = async (req, res) => {
  const { userId, otp } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(400).json({ message: "User not found" });

    if (user.otp === otp) {
      user.verified = true;
      user.otp = null;
      await user.save();

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
};


module.exports = { Login, Signup, SignupVerify };