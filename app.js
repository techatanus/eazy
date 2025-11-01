const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
require('dotenv').config();
const db = require('./config/db');

const indexRouter = require('./routes/index');
const adminRouter = require('./routes/admin');



const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({ secret: process.env.SESSION_SECRET || 'secret', resave: false, saveUninitialized: true }));


app.use('/', indexRouter);
app.use('/admin', adminRouter);

app.use(
  session({
    secret:process.env.SESSION_SECRET, // put in .env
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // set to true if using HTTPS
  })
);


// --- APPROVE Tender ---
app.get("/t_approve", async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).send("Tender ID missing");

    await db.query("UPDATE jobs SET status = 'approved', reason = NULL WHERE id = ?", [id]);
    res.redirect("/admin/approve"); // redirect to tender list after update
  } catch (error) {
    console.error("Error approving tender:", error);
    res.status(500).send("Server error approving tender");
  }
});

// --- REJECT Tender (POST with reason) ---
app.post("/t_reject", async (req, res) => {
  try {
    const { id, reason } = req.body;
    if (!id) return res.status(400).send("Tender ID missing");
    if (!reason || reason.trim() === "")
      return res.status(400).send("Please provide a rejection reason");

    await db.query("UPDATE jobs SET status = 'rejected', reason = ? WHERE id = ?", [reason, id]);
    res.json({ success: true, message: "Tender rejected successfully" });
  } catch (error) {
    console.error("Error rejecting tender:", error);
    res.status(500).send("Server error rejecting tender");
  }
});


// jobid in sess
app.get("/api/get-session", (req, res) => {
  if (req.session && req.session.jobId) {
    return res.json({ job_id: req.session.jobId });
  } else {
    return res.status(404).json({ message: "No job ID found in session" });
  }
});




const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));