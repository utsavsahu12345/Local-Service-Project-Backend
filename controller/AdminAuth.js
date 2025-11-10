const jwt = require('jsonwebtoken');
const AdminUser = require('../Mongodb/AdminLogin');

// app.post("/admin/login", 
const AdminLogin = async (req, res) => {
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
    };

module.exports = { AdminLogin };