const Booking = require("../Mongodb/Booking");
const User = require("../Mongodb/User");
const ServiceAdd = require("../Mongodb/ServiceAdd");

// app.get("/admin/api/customercount", 
const CustomerCount = async (req, res) => {
  try {
    const count = await User.countDocuments({ role: "Customer" }); // 👈 sirf customer count
    res.status(200).json({ totalCustomers: count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


// app.get("/admin/api/servicecount", 
const ServiceProviderCount = async (req, res) => {
  try {
    const count = await User.countDocuments({ role: "Service Provider" });
    res.status(200).json({ totalServices: count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// app.get("/admin/api/pendingbookings", 
const PendingBookingCount = async (req, res) => {
  try {
    const count = await Booking.countDocuments({ status: "pending" });
    res.status(200).json({ pendingBookings: count });
  } catch (err) {
    console.error("Error fetching pending bookings:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

// app.get("/admin/service/approve/", 
const ServiceApprove = async (req, res) => {
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
};

// app.put("/admin/service/approve/button/update/:id", 
const ApproveButtonUpdate = async (req, res) => {
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
};

// app.get("/admin/bookings", 
const AdminBooking = async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ customerdate: -1 });
    res.status(200).json(bookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ message: "Failed to fetch bookings" });
  }
};

// 🟢 PUT cancel booking (admin only)
// app.put("/admin/bookings/:id/cancel", 
const BookingCancel = async (req, res) => {
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
};

// app.get("/admin/users", 
const AdminUsers = async (req, res) => {
  try {
    const customers = await User.find({ role: "Customer" });
    const serviceProviders = await User.find({ role: "Service Provider" });
    const allUsers = [...customers, ...serviceProviders];

    res.status(200).json(allUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
};


// app.put("/admin/users/:id/block", 
const AdminUserBlock = async (req, res) => {
  try {
    const { block } = req.body; // true or false
    const { id } = req.params;  // user id
    const user = await User.findByIdAndUpdate(
      id,
      { block },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({
      message: `User ${block ? "blocked" : "unblocked"} successfully`,
      user,
    });
  } catch (error) {
    console.error("Error updating block status:", error);
    res.status(500).json({ message: "Failed to update user status" });
  }
};


module.exports = {CustomerCount, ServiceProviderCount, PendingBookingCount, ServiceApprove, ApproveButtonUpdate, AdminUsers, AdminUserBlock, AdminBooking, BookingCancel};