const express = require('express');
const router = express.Router();
const adminCtrl = require('../controllers/adminController');
const db = require('../config/db');

// Dashboard
router.get('/dashboard', adminCtrl.dashboard);


// Permissions
router.get('/permissions', adminCtrl.permissionsList);
router.post('/permissions', adminCtrl.createPermission);

router.get('/suplier',adminCtrl.suppliers);
router.get('/client',adminCtrl.clients);
router.get('/super',adminCtrl.admins);
// Roles
// router.get('/roles', adminCtrl.rolesList);
// router.post('/roles', adminCtrl.createRole);
// create single categories

router.get('/perms', (req, res) => {
  res.render('permissions'); // assuming your file is permissions.ejs
});

router.get('/super',(req,res)=>{
  res.render('super')
})

router.get('/client',(req,res)=>{
  res.render('client')
})

router.get('/suplier',(req,res)=>{
  res.render('supplier')
})

router.get('/bids',(req,res)=>{
  res.render('rfx')
})

// tenders

router.get('/tender', async (req, res) => {
  try {
    const [tenders] = await db.query("SELECT * FROM tenders");
    console.log("✅ Retrieved tenders:", tenders); // Debugging log

    res.render('tender', { tenders });
  } catch (err) {
    console.error("❌ Error loading closed tenders:", err.message);
    res.status(500).send("Error loading tenders: " + err.message);
  }
});



router.get('/preq',(req,res)=>{
  res.render('preq')
})

router.get('/log',(req,res)=>{
  res.render('logs')
})

router.get('/reports',(req,res)=>{
  res.render('report')
})

router.get('/sms',(req,res)=>{
  res.render('sms')
})
// suplier_profile
router.get('/sup_profile',(req,res)=>{
  res.render('suplier_profile')
})

// statutory document
router.get('/doc',(req,res)=>{
  res.render('document')
})
// rfq
router.get('/rfq',(req,res)=>{
  res.render('rfq')
})
// rfp
router.get('/rfp',(req,res)=>{
  res.render('rfp');
})
// eoi
router.get('/eoi',(req,res)=>{
  res.render('eoi');
})
// rfi
router.get('/rfi',(req,res)=>{
  res.render('rfi');
})

// reverse auction
router.get('/auction',(req,res)=>{
  res.render('rev_auction');
});





module.exports = router;