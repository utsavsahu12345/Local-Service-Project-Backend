const ServiceAdd = require("../Mongodb/ServiceAdd");
const Booking = require("../Mongodb/Booking");
const multer = require("multer");
const nodemailer = require("nodemailer");

const storage = multer.memoryStorage();
const upload = multer({ storage });

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// app.get("/service/dashboard/:username", 
const ServiceDashboard = async (req, res) => {
  try {
    const services = await ServiceAdd.find({ username: req.params.username });
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// app.delete("/service/delete/:username/:id", 
const ServiceDelete = async (req, res) => {
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
};

// app.put("/service/update/:username/:id", 
const ServiceUpdate = async (req, res) => {
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
};

// app.post("/booking/verify-otp/:id", 
const BookingVerifyOTP = async (req, res) => {
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
};

// app.get("/service/booking/data/:providerusername", 
const ServiceBookingData = async (req, res) => {
  try {
    const bookings = await Booking.find({
      providerusername: req.params.providerusername,
    });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// app.put("/service/booking/status/:id", 
const ServiceBookingStatus = async (req, res) => {
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
};


// app.post("/booking/send-otp/:id", 
const BookingSendOTP = async (req, res) => {
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
};

const AddService = async (req, res) => {
  try {
    const {
      username,
      name,
      phone,
      service,
      experience,
      description,
      location,
      visitingPrice,
      maxPrice,
      status,
    } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "Image is required" });
    }
    const newService = new ServiceAdd({
      username,
      name,
      phone,
      service,
      experience,
      description,
      location,
      visitingPrice,
      maxPrice,
      status: status?.toLowerCase(),
      image: {
        data: req.file.buffer,
        contentType: req.file.mimetype,
      },
    });
    await newService.save();
    res.json({ message: "Service added successfully", service: newService });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const BookingCompleted = async (req, res) => {
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
};

// app.get("/book/service/:username", 
const BookService = async (req, res) => {
  try {
    const { username } = req.params;
    const bookings = await Booking.find({ customerusername: username });
    if (!bookings.length)
      return res.status(404).json({ message: "No bookings found" });

    // Convert image buffer to base64
    const formatted = bookings.map((b) => ({
      ...b._doc,
      image: {
        data: b.image?.data?.toString("base64"),
        contentType: b.image?.contentType,
      },
    }));

    res.json(formatted);
  } catch (err) {
    console.error("Error fetching bookings:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// app.post("/book/service/:id/feedback", 
  const ServiceFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { feedback } = req.body;

    if (!feedback.trim())
      return res.status(400).json({ message: "Feedback cannot be empty" });

    const booking = await Booking.findById(id);
    if (!booking)
      return res.status(404).json({ message: "Booking not found" });

    booking.feedback = feedback;
    booking.feedbackStatus = true;
    await booking.save();

    res.json({ message: "Feedback submitted successfully" });
  } catch (err) {
    console.error("Error submitting feedback:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// app.put("/booking/:id/cancel", 
const BookingCancel = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: "cancel" },
      { new: true }
    );
    res.json({ message: "Booking cancelled", booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { ServiceDashboard, ServiceDelete, ServiceUpdate, BookingVerifyOTP, ServiceBookingData, ServiceBookingStatus, BookingSendOTP, BookingCompleted, AddService, BookingCancel, ServiceFeedback, BookService, upload };