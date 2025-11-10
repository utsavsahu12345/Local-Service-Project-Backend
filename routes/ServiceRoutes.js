const express = require('express');
const {ServiceDashboard, ServiceDelete, ServiceUpdate, BookingVerifyOTP, ServiceBookingData, ServiceBookingStatus, BookingCompleted, BookingSendOTP, AddService, BookService, BookingCancel, ServiceFeedback, upload} = require('../controller/Service');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

router.use(verifyToken);

router.get('/dashboard/:username', ServiceDashboard);
router.delete('/delete/:username/:id', ServiceDelete);
router.put('/update/:username/:id', ServiceUpdate);
router.post('/booking/verify-otp/:id', BookingVerifyOTP);
router.get('/booking/data/:providerusername', ServiceBookingData);
router.put('/booking/status/:id', ServiceBookingStatus);
router.post('/booking/send-otp/:id', BookingSendOTP);
router.post('/add', upload.single('image'), AddService);
router.post('/booking/completed', BookingCompleted);

router.get('/book/service/:username', BookService);
router.post('/book/:id/feedback', ServiceFeedback);
router.put('/booking/:id/cancel', BookingCancel);

module.exports = router;