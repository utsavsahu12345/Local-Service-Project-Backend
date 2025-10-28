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
      "http://localhost:5173",
      "https://local-service-project-frontend.vercel.app",
    ],
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

const CustomerLogin = require("./Mongodb/CustomerLogin");
const ServiceLogin = require("./Mongodb/ServiceLogin");
const ServiceAdd = require("./Mongodb/ServiceAdd");
const Booking = require("./Mongodb/Booking");
const AdminUser = require("./Mongodb/AdminLogin");

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

// Signup route
app.post("/customer/signup", async (req, res) => {
  const { fullName, username, email, password } = req.body;

  // Check if user exists
  const existingUser = await CustomerLogin.findOne({ email });
  if (existingUser)
    return res.status(400).json({ message: "Email already exists" });

  // Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  const newUser = new CustomerLogin({
    fullName,
    username,
    email,
    password,
    otp,
  });
  await newUser.save();

  // Send OTP via email
  await transporter.sendMail({
    from: process.env.EMAIL,
    to: email,
    subject: "Email Verification OTP",
    text: `Your OTP is: ${otp}`,
  });

  res.json({ message: "OTP sent to email", userId: newUser._id });
});

// Verify OTP route
app.post("/customer/verify-otp", async (req, res) => {
  const { userId, otp } = req.body;

  try {
    const user = await CustomerLogin.findById(userId);
    if (!user) return res.status(400).json({ message: "User not found" });

    if (user.otp === otp) {
      // ✅ Mark user as verified and remove OTP
      user.verified = true;
      user.otp = null;
      await user.save();

      // ✅ Create JWT token
      const token = jwt.sign(
        {
          fullName: user.fullName,
          email: user.email,
          username: user.username,
          role: user.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      // ✅ Set token in cookie
      res.cookie("token", token, {
        httpOnly: true, // not accessible by JS (secure)
        secure: false, // change to true in production (https)
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000, // 1 days
      });

      // ✅ Send user info + token to frontend (optional)
      return res.json({
        message: "Email verified successfully",
        user: {
          fullName: user.fullName,
          username: user.username,
          email: user.email,
          role: user.role,
        },
        token, // optional if frontend wants it too
      });
    } else {
      return res.status(400).json({ message: "Invalid OTP" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/customer/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // find by email or username
    const user = await CustomerLogin.findOne({
      $or: [{ username: username }, { email: username }],
    });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }
    if (user.password !== password) {
      return res.status(400).json({ message: "Invalid password" });
    }
    if (!user.verified) {
      return res
        .status(400)
        .json({ message: "Please verify your email first" });
    }
    const token = jwt.sign(
      {
        fullName: user.fullName,
        email: user.email,
        username: user.username,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // ✅ Set token in cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // ✅ true in Vercel
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // ✅ required for cross-origin
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    // ✅ Send user info (optional)
    res.json({
      message: "Login successful",
      user: {
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      token, // optional if frontend wants token in JSON too
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/service/signup", async (req, res) => {
  const { fullName, username, email, password } = req.body;

  // Check if user exists
  const existingUser = await ServiceLogin.findOne({ email });
  if (existingUser)
    return res.status(400).json({ message: "Email already exists" });

  // Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  const newUser = new ServiceLogin({
    fullName,
    username,
    email,
    password,
    otp,
  });
  await newUser.save();

  // Send OTP via email
  await transporter.sendMail({
    from: process.env.EMAIL,
    to: email,
    subject: "Email Verification OTP",
    text: `Your OTP is: ${otp}`,
  });

  res.json({ message: "OTP sent to email", userId: newUser._id });
});

// Verify OTP route
app.post("/service/verify-otp", async (req, res) => {
  const { userId, otp } = req.body;

  try {
    const user = await ServiceLogin.findById(userId);
    if (!user) return res.status(400).json({ message: "User not found" });

    if (user.otp === otp) {
      // ✅ Mark user as verified and remove OTP
      user.verified = true;
      user.otp = null;
      await user.save();

      // ✅ Create JWT token
      const token = jwt.sign(
        {
          fullName: user.fullName,
          email: user.email,
          username: user.username,
          role: user.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      // ✅ Set token in cookie
      res.cookie("token", token, {
        httpOnly: true, // not accessible by JS (secure)
        secure: false, // change to true in production (https)
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000, // 1 days
      });

      // ✅ Send user info + token to frontend (optional)
      return res.json({
        message: "Email verified successfully",
        user: {
          fullName: user.fullName,
          username: user.username,
          email: user.email,
          role: user.role,
        },
        token, // optional if frontend wants it too
      });
    } else {
      return res.status(400).json({ message: "Invalid OTP" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/service/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await ServiceLogin.findOne({
      $or: [{ username: username }, { email: username }],
    });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }
    if (user.password !== password) {
      return res.status(400).json({ message: "Invalid password" });
    }
    if (!user.verified) {
      return res
        .status(400)
        .json({ message: "Please verify your email first" });
    }
    const token = jwt.sign(
      {
        fullName: user.fullName,
        email: user.email,
        username: user.username,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // ✅ Set token in cookie
    res.cookie("token", token, {
      httpOnly: true, // JS cannot access cookie
      secure: false, // set true in production (https)
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 1 days
    });

    // ✅ Send user info (optional)
    res.json({
      message: "Login successful",
      user: {
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      token, // optional if frontend wants token in JSON too
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/admin/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Please provide username and password" });
    }

    const admin = await AdminUser.findOne({ username });
    if (!admin) return res.status(401).json({ message: "Invalid Username" });

    // simple password check (agar hashed password use nahi ho raha)
    if (password !== admin.password) {
      return res.status(401).json({ message: "Invalid Password" });
    }

    // ✅ JWT create karna
    const token = jwt.sign(
      { id: admin._id, username: admin.username, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // ✅ Cookie me save karna
    res.cookie("token", token, {
      httpOnly: true, // JS se access nahi hoga
      secure: false, // localhost test ke liye, production me true
      sameSite: "lax", // CORS handling
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    res.json({ message: "Login successful" });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/customer/home", async (req, res) => {
  try {
    const activeServices = await ServiceAdd.find({
      status: "active",
      approve: "approve",
    });
    res.json(activeServices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//  home service get data for service
app.get("/service/home/:username", async (req, res) => {
  try {
    const services = await ServiceAdd.find({ username: req.params.username });
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// 🔹 Update service
app.put("/service/update/:username/:id", async (req, res) => {
  try {
    const service = await ServiceAdd.findOneAndUpdate(
      { _id: req.params.id, username: req.params.username },
      req.body,
      { new: true }
    );
    if (!service) return res.status(404).json({ error: "Service not found" });
    res.json(service);
  } catch (err) {
    res.status(500).json({ error: "Error updating service" });
  }
});

app.delete("/service/delete/:username/:id", async (req, res) => {
  try {
    const service = await ServiceAdd.findOneAndDelete({
      _id: req.params.id,
      username: req.params.username,
    });
    if (!service) return res.status(404).json({ error: "Service not found" });
    res.json({ message: "Service deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Error deleting service" });
  }
});

app.post("/customer/booking/completed", async (req, res) => {
  try {
    const {
      customerusername,
      customername,
      customeremail,
      customeraddress,
      customerphone,
      customerdate,
      customerdescription,
      status,
      providerusername,
      providername,
      providerphone,
      service,
      experience,
      providerdescription,
      providerlocation,
      visitingPrice,
      maxPrice,
      image,
    } = req.body;
    const newBooking = new Booking({
      customerusername,
      customername,
      customeremail,
      customeraddress,
      customerphone,
      customerdate,
      customerdescription,
      status,
      providerusername,
      providername,
      providerphone,
      service,
      experience,
      providerdescription,
      providerlocation,
      visitingPrice,
      maxPrice,
    });
    if (image && image.data) {
      newBooking.image = {
        data: Buffer.from(image.data, "base64"),
        contentType: image.contentType,
      };
    }
    await newBooking.save();
    res.status(201).json({ message: "Booking saved successfully!" });
  } catch (err) {
    console.error("Booking Error:", err);
    res.status(500).json({ error: "Error saving booking" });
  }
});

app.get("/customer/bookings", async (req, res) => {
  try {
    const { customerusername } = req.query;
    let query = {};

    if (customerusername) {
      query.customerusername = customerusername; // Filter by username
    }

    const bookings = await Booking.find(query);
    res.status(200).json(bookings);
  } catch (err) {
    console.error("Error fetching bookings:", err);
    res.status(500).json({ error: "Error fetching bookings" });
  }
});

// PUT: Cancel Booking
app.put("/customer/booking/cancel/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // Expected: { status: "Cancelled" }

    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    booking.status = status;
    await booking.save();

    res.json({ message: "Booking cancelled successfully", booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/service/feedback/:providerusername", async (req, res) => {
  try {
    const bookings = await Booking.find({
      providerusername: req.params.providerusername,
      feedbackStatus: true, // sirf true feedback status wale
    });
    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/booking/status/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    booking.status = status;
    await booking.save();
    res.status(200).json({ message: "Status updated successfully", booking });
  } catch (error) {
    console.error("Error updating booking status:", error);
    res.status(500).json({ message: "Server error", error });
  }
});

app.post("/booking/send-otp/:id", async (req, res) => {
  const bookingId = req.params.id;

  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP and expiry (5 min)
    booking.otp = otp;
    booking.otpExpires = Date.now() + 5 * 60 * 1000;
    await booking.save();

    // Send email
    await transporter.sendMail({
      from: '"Service App" <youremail@gmail.com>',
      to: booking.customeremail,
      subject: "Your OTP for Booking Completion",
      text: `Your OTP to mark the service as completed is: ${otp}. It will expire in 5 minutes.`,
    });

    res.json({ success: true, message: "OTP sent to customer email" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

// --- 2️⃣ Verify OTP ---
app.post("/booking/verify-otp/:id", async (req, res) => {
  const bookingId = req.params.id;
  const { otp } = req.body;
  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (!booking.otp || !booking.otpExpires) {
      return res
        .status(400)
        .json({ success: false, message: "No OTP found. Please resend." });
    }
    if (booking.otpExpires < Date.now()) {
      return res
        .status(400)
        .json({ success: false, message: "OTP expired. Please resend." });
    }
    if (booking.otp !== otp) {
      return res.status(400).json({ success: false, message: "Incorrect OTP" });
    }
    booking.status = "completed";
    booking.otp = undefined;
    booking.otpExpires = undefined;
    await booking.save();
    res.json({ success: true, message: "Booking marked as completed" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/feedback/", async (req, res) => {
  const { customerusername, status } = req.query;
  const filter = {};
  if (customerusername) filter.customerusername = customerusername;
  if (status) filter.status = status;

  try {
    const bookings = await Booking.find(filter);
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: "Error fetching bookings" });
  }
});
app.post("/feedback/submit/", async (req, res) => {
  const { bookingId, feedbackText } = req.body;
  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    booking.feedback = feedbackText;
    booking.feedbackStatus = true;

    await booking.save();
    res.status(200).json({ message: "Feedback submitted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/service/booking/data/:providerusername", async (req, res) => {
  try {
    const bookings = await Booking.find({
      providerusername: req.params.providerusername,
    });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/customercount", async (req, res) => {
  try {
    const count = await CustomerLogin.countDocuments();
    res.status(200).json({ totalCustomers: count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Service user count
app.get("/api/servicecount", async (req, res) => {
  try {
    const count = await ServiceLogin.countDocuments();
    res.status(200).json({ totalServices: count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/pendingbookings", async (req, res) => {
  try {
    const count = await Booking.countDocuments({ status: "pending" });
    res.status(200).json({ pendingBookings: count });
  } catch (err) {
    console.error("Error fetching pending bookings:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

app.get("/admin/service/approve/", async (req, res) => {
  try {
    // Fetch all services sorted by latest
    const services = await ServiceAdd.find().sort({ _id: -1 });

    const formattedServices = services.map((s) => {
      let imageBase64 = null;
      if (s.image?.data) {
        imageBase64 = `data:${
          s.image.contentType
        };base64,${s.image.data.toString("base64")}`;
      }

      return {
        ...s.toObject(),
        imageBase64,
      };
    });

    res.json(formattedServices);
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

app.put("/admin/service/approve/button/update/:id", async (req, res) => {
  try {
    const { status } = req.body; // status = "approve" or "reject"
    const updated = await ServiceAdd.findByIdAndUpdate(
      req.params.id,
      { approve: status },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Service not found" });
    res.json({ message: `Service ${status} successfully`, data: updated });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

app.get("/admin/bookings", async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ customerdate: -1 });
    res.status(200).json(bookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ message: "Failed to fetch bookings" });
  }
});

// 🟢 PUT update booking status (general use)
app.put("/bookings/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const updatedBooking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!updatedBooking)
      return res.status(404).json({ message: "Booking not found" });
    res.status(200).json(updatedBooking);
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(400).json({ message: "Failed to update booking" });
  }
});

// 🟢 PUT cancel booking (admin only)
app.put("/admin/bookings/:id/cancel", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    // prevent cancel if completed, rejected or already canceled
    if (
      ["completed", "rejected", "cancel"].includes(booking.status.toLowerCase())
    ) {
      return res
        .status(400)
        .json({ message: `Cannot cancel a ${booking.status} booking.` });
    }

    booking.status = "cancel";
    await booking.save();

    res.status(200).json({ message: "Booking cancelled successfully" });
  } catch (error) {
    console.error("Error cancelling booking:", error);
    res.status(400).json({ message: "Failed to cancel booking" });
  }
});

app.get("/admin/users", async (req, res) => {
  try {
    const customers = await CustomerLogin.find();
    const services = await ServiceLogin.find();
    const allUsers = [...customers, ...services];
    res.status(200).json(allUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

app.put("/admin/users/:id/block", async (req, res) => {
  try {
    const { block } = req.body;
    const { id } = req.params;

    let user = await CustomerLogin.findByIdAndUpdate(
      id,
      { block },
      { new: true }
    );
    if (!user) {
      user = await ServiceLogin.findByIdAndUpdate(id, { block }, { new: true });
    }
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json({
      message: `User ${block ? "blocked" : "unblocked"} successfully`,
      user,
    });
  } catch (error) {
    console.error("Error updating block status:", error);
    res.status(500).json({ message: "Failed to update user status" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
