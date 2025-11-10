const express = require('express');
const {ServiceLogin, ServiceSignup, ServiceVerifyOTP} = require('../controller/ServiceAuth');

const router = express.Router();

router.post('/login', ServiceLogin);
router.post('/signup', ServiceSignup);
router.post('/verify-otp', ServiceVerifyOTP);

module.exports = router;