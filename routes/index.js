const express = require('express');
const router = express.Router();
const adminCtrl = require('../controllers/adminController');

// Dashboard
router.get('/dashboard', adminCtrl.dashboard);

// Permissions
router.get('/permissions', adminCtrl.permissionsList);
router.post('/permissions', adminCtrl.createPermission);

// Roles
router.get('/roles', adminCtrl.rolesList);
router.post('/roles', adminCtrl.createRole);

router.get('/', (req, res) => {
  res.send('Admin Dashboard');
});

module.exports = router;   // ✅ this is correct
