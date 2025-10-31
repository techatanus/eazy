const express = require('express');
const router = express.Router();
const multer = require("multer");
const adminCtrl = require('../controllers/adminController');



router.use(express.json()); // handles JSON body
router.use(express.urlencoded({ extended: true })); // handles form data



// 🔹 Configure Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Folder to save images
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

// 🔹 Initialize upload
const upload = multer({ storage });

// Permissions
router.get('/permissions', adminCtrl.permissionsList);
router.post('/permissions', adminCtrl.createPermission);

router.get("/dashboard", adminCtrl.dashboard);
// Roles
// router.get('/roles', adminCtrl.rolesList);
// router.post('/roles', adminCtrl.createRole);

router.get('/', (req, res) => {
  res.render('home');
});




// Dashboard
exports.dashboard = async (req, res) => {
  try {
    const [adminsRows] = await db.query("SELECT COUNT(*) as c FROM admins");
    const [clientsRows] = await db.query("SELECT COUNT(*) as c FROM clients");
    const [suppliersRows] = await db.query("SELECT COUNT(*) as c FROM suppliers");
    const [openTendersRows] = await db.query(
      "SELECT t.*, c.name as name FROM tenders t LEFT JOIN clients c ON t.client_id=c.id WHERE status='open' ORDER BY closing_date ASC LIMIT 10"
    );

    const user = req.session.user || { person: "Guest" };

    res.render("dashboard", {
      totals: {
        admins: adminsRows[0].c,
        clients: clientsRows[0].c,
        suppliers: suppliersRows[0].c,
      },
      openTenders: openTendersRows,
      user: user, // 👈 outside totals
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error in Dashboard");
  }
};



// post user account info
router.post('/sign',adminCtrl.createUser);

// verify login
router.get('/verify/:token',adminCtrl.verifyUser);

// login
router.post('/login',adminCtrl.loginUser);

// logout user
router.get('/logout',adminCtrl.logoutUser);

// create single category
router.post('/add_category',adminCtrl.create_category);

// rfqs
router.post('/create_rfq',adminCtrl.createRFQ);

//create admin
router.post("/sups", upload.single("profilePicture"), adminCtrl.createAdmin);

// post rfps
router.post('/create_rfp',adminCtrl.createRFP)
// create eoi
router.post('/create_eoi',adminCtrl.createEOI);
// create rfi buyer
router.post('/create_rfib',adminCtrl.createRFIB);
// create rfi supplier
router.post('/create_rfis',adminCtrl.createRFIS);
// create tender
router.post('/create_tender',adminCtrl.createTender);
// post alerts
router.post('/subscriptions', adminCtrl.createAlert);
// Post notification
router.post('/notify',adminCtrl.createNotification);
// post suplier regdetails
router.post('/regdetails',upload.single("profile"),adminCtrl.createRegDetails);
// statutory
router.post('/sub_stat',adminCtrl.createStatutory);
// compliance
router.post("/comply", adminCtrl.createCompliance);
// new job
router.post('/create_job',adminCtrl.createNewJob);
// multi category upload
router.post(
  "/multi_upload",
  adminCtrl.uploadFile,
  adminCtrl.multiUpload
);

// quiz upload
router.post('/quiz', adminCtrl.createQuiz);






































module.exports = router;   

