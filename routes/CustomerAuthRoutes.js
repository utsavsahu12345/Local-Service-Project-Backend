const express = require('express');
const {CustomerLogin, CustomerSignup, CustomerVerifyOTP} = require('../controller/CustomerAuth');

const router = express.Router();

router.post('/login', CustomerLogin);
router.post('/signup', CustomerSignup);
router.post('/verify-otp', CustomerVerifyOTP);

module.exports = router;