const jwt = require('jsonwebtoken');
const User = require('../Mongodb/User');

const CustomerLogin = async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({
      $or: [{ username }, { email: username }],
    });
    if (!user) return res.status(400).json({ message: "User not found" });
    // ✅ Role check
    if (user.role !== "Customer") {
      return res.status(403).json({ message: "Access denied. Only customers can login." });
    }

    if (user.password !== password)
      return res.status(400).json({ message: "Invalid password" });

    if (!user.verified)
      return res.status(400).json({ message: "Please verify your email first" });

    // ✅ Create JWT Token
    const token = jwt.sign(
      {
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

    // ✅ Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    // ✅ Response
    res.json({
      message: "Login successful",
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// app.post("/customer/auth/signup", 
const CustomerSignup = async (req, res) => {
  const { fullName, username, email, password, gender, location } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser)
    return res.status(400).json({ message: "Email already exists" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  const newUser = new User({
    fullName,
    username,
    email,
    password,
    gender,
    location,
    otp,
  });

  await newUser.save();

  await transporter.sendMail({
    from: process.env.EMAIL,
    to: email,
    subject: "Email Verification OTP",
    text: `Your OTP is: ${otp}`,
  });

  res.json({ message: "OTP sent to email", userId: newUser._id });
};


// Verify OTP route
// app.post("/customer/auth/verify-otp", 
const CustomerVerifyOTP = async (req, res) => {
  const { userId, otp } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(400).json({ message: "User not found" });

    if (user.otp === otp) {
      user.verified = true;
      user.otp = null;
      await user.save();

      // Include gender & location in JWT
      const token = jwt.sign(
        {
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
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


module.exports = { CustomerLogin, CustomerSignup, CustomerVerifyOTP};