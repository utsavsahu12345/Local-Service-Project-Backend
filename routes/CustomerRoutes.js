const express = require('express');
const {CustomerService, BookingCompleted, BookService, CustomerFeedback, BookingCancel, getPopularServices} = require('../controller/Customer');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

router.use(verifyToken);

router.get('/service', CustomerService);
router.post('/booking/completed', BookingCompleted);
router.get('/book/service/:username', BookService);
router.post('/book/service/:id/feedback', CustomerFeedback);
router.put('/booking/:id/cancel', BookingCancel);
router.get('/popular-services', getPopularServices);

module.exports = router;