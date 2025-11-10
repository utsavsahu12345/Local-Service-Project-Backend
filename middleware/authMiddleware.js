// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  try {
    const token = req.cookies.token; // cookie se token nikaal rahe hain
    if (!token) return res.status(401).json({ message: "No token found" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // user info ko request ke sath attach kar diya
    next();
  } catch (err) {
    console.error("JWT Error:", err);
    res.status(403).json({ message: "Invalid or expired token" });
  }
};

module.exports = verifyToken;
