const express = require('express');
const {Login, Signup, SignupVerify} = require('../controller/Auth');

const router = express.Router();

router.post('/login', Login);
router.post('/signup', Signup);
router.post('/signup/verify-otp', SignupVerify);

module.exports = router;