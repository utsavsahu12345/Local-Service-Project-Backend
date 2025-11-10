const ServiceAdd = require("../Mongodb/ServiceAdd");
const Booking = require("../Mongodb/Booking");

// app.get("/customer/home", 
const CustomerService = async (req, res) => {
  try {
    const activeServices = await ServiceAdd.find({
      status: "active",
      approve: "approve",
    });
    res.json(activeServices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// app.post("/customer/booking/completed", 
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
  const CustomerFeedback = async (req, res) => {
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

const getPopularServices = async (req, res) => {
  try {
    const services = await ServiceAdd.aggregate([
      { $match: { status: "active", approve: "approve" } },
      { $sample: { size: 3 } },
      {
        $project: {
          username: 1,
          name: 1,
          phone: 1,
          service: 1,
          experience: 1,
          description: 1,
          location: 1,
          visitingPrice: 1,
          maxPrice: 1,
          image: 1,
        },
      },
    ]);
    const formatted = services.map((s) => {
      let imageBase64 = null;
      if (s.image && s.image.data) {
        try {
          imageBase64 = `data:${
            s.image.contentType || "image/jpeg"
          };base64,${s.image.data.toString("base64")}`;
        } catch (err) {
          console.error("Error converting image for service:", s._id, err);
        }
      }

      return {
        ...s,
        image: imageBase64,
      };
    });

    res.status(200).json(formatted);
  } catch (err) {
    console.error("Error fetching popular services:", err);
    res.status(500).json({ message: "Failed to fetch popular services" });
  }
};

module.exports = { CustomerService, BookingCompleted, BookService, CustomerFeedback, BookingCancel, getPopularServices };