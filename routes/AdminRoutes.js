const express = require('express');
const {CustomerCount, ServiceProviderCount, PendingBookingCount, ServiceApprove, ApproveButtonUpdate, AdminUsers, AdminUserBlock, AdminBooking, BookingCancel} = require('../controller/Admin');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

router.use(verifyToken);

router.get('/api/customercount', CustomerCount);
router.get('/api/servicecount', ServiceProviderCount);
router.get('/api/pendingbookings', PendingBookingCount);
router.get('/service/approve/', ServiceApprove);
router.put('/service/approve/button/update/:id', ApproveButtonUpdate);
router.get('/users', AdminUsers);
router.put('/users/:id/block', AdminUserBlock);
router.get('/bookings', AdminBooking);
router.put('/bookings/:id/cancel', BookingCancel);

module.exports = router;