const db = require('../config/db');
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const axios = require('axios');
const nodemailer = require("nodemailer");
const multer = require("multer");
const { resolveSoa } = require('dns');
const { log } = require('console');
const xlsx = require("xlsx");
const path = require("path");

// admin
exports.dashboard = async (req, res) => {
  try {
    const [adminsRows] = await db.query("SELECT COUNT(*) as c FROM admins");
    const [clientsRows] = await db.query("SELECT COUNT(*) as c FROM clients");
    const [suppliersRows] = await db.query("SELECT COUNT(*) as c FROM suppliers");
 

    const [openTendersRows] = await db.query( "SELECT * FROM tenders WHERE status IN ('open', 'Draft','closed') ORDER BY closing_date ASC LIMIT 10" );
// open jobs -approved
const [currentListingRows] = await db.query(`
 SELECT 
    j.id AS job_id,
    j.client,
    j.bid_title,
    j.closing_datetime,
    j.eligibility,
    j.status,
    c.category_no,
    c.category_name,
    c.price,
    c.description,
    u.file
  FROM jobs j
  JOIN categories c 
    ON j.id = c.job_id
  LEFT JOIN uploads u 
    ON c.job_id = u.job_id 
    AND c.category_name = u.category
  WHERE j.status = 'approved'
  ORDER BY j.closing_datetime ASC
`);
   
    // Get open jobs (open or draft tenders)
  const [openJobsCountRows] = await db.query(
      "SELECT COUNT(*) as total FROM tenders WHERE status IN ('open', 'Draft')"
    );
    // Get closed jobs (closed tenders)
     const [closedJobsCountRows] = await db.query(
      "SELECT COUNT(*) as total FROM tenders WHERE status = 'closed'"
    );

  const [category] = await db.query("SELECT * FROM categories");
    const user = req.session.user || { person: "Guest" };

    // Pull flash message then clear it
    const message = req.session.message || null;
    const status = req.session.status || null;
    req.session.message = null;
    req.session.status = null;

    res.render("dashboard", {
      totals: {
        admins: adminsRows[0].c,
        clients: clientsRows[0].c,
        suppliers: suppliersRows[0].c,
        openJobs: openJobsCountRows[0].total,
        closedJobs: closedJobsCountRows[0].total
      },
     // closed tenders
      openTenders: openTendersRows,
      openJobs:currentListingRows,
      category,
      user,
      message,
      status
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error in Dashboard");
  }
};

// supplier
exports.dashboards = async (req, res) => {
  try {
    const [adminsRows] = await db.query("SELECT COUNT(*) as c FROM admins");
    const [clientsRows] = await db.query("SELECT COUNT(*) as c FROM clients");
    const [suppliersRows] = await db.query("SELECT COUNT(*) as c FROM suppliers");

  // ✅ Count tenders per category and status
const [categoryStatusCounts] = await db.query(`
  SELECT 
    category,
    SUM(CASE WHEN status = 'Draft' THEN 1 ELSE 0 END) AS Draft,
    SUM(CASE WHEN status = 'Open' THEN 1 ELSE 0 END) AS Open,
    SUM(CASE WHEN status = 'Closed' THEN 1 ELSE 0 END) AS Closed,
    SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) AS Rejected,
    SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) AS Approved
  FROM tenders
  GROUP BY category
  ORDER BY COUNT(id) DESC
`);

// current listing
const [currentListingRows] = await db.query(`
SELECT 
    j.id AS job_id,
    j.client,
    j.reason,
    j.bid_title,
    j.start_datetime, 
    j.closing_datetime,
    j.eligibility,
    j.status,
    c.category_no,
    c.category_name,
    c.price,
    c.description,
    u.file
  FROM jobs j
  JOIN categories c 
    ON j.id = c.job_id
  LEFT JOIN uploads u 
    ON c.job_id = u.job_id 
    AND c.category_name = u.category
  WHERE j.status = 'approved'
  ORDER BY j.closing_datetime ASC
`);

    // Count total by status for pie chart
    const [statusCounts] = await db.query(`
      SELECT 
        SUM(CASE WHEN status = 'Draft' THEN 1 ELSE 0 END) AS Draft,
        SUM(CASE WHEN status = 'Open' THEN 1 ELSE 0 END) AS Open,
        SUM(CASE WHEN status = 'Closed' THEN 1 ELSE 0 END) AS Closed,
        SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) AS Rejected,
        SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) AS Approved
      FROM tenders
    `);
  const [openTendersRows] = await db.query(
      "SELECT * FROM tenders WHERE status IN ('Open', 'Draft', 'Closed', 'Rejected', 'Approved') ORDER BY closing_date ASC LIMIT 10"
    );
    // Other totals
    const [openJobsCountRows] = await db.query(
      "SELECT COUNT(*) as total FROM tenders WHERE status IN ('open', 'Draft')"
    );
    const [closedJobsCountRows] = await db.query(
      "SELECT COUNT(*) as total FROM tenders WHERE status = 'closed'"
    );
const [category] = await db.query("SELECT * FROM categories"); user = req.session.user || { person: "Guest" };

    // flash msgs

    // const user = req.session.user || { person: "Guest" };
    const message = req.session.message || null;
    const status = req.session.status || null;
    req.session.message = null;
    req.session.status = null;

    res.render("dashsup", {
      totals: {
        admins: adminsRows[0].c,
        clients: clientsRows[0].c,
        suppliers: suppliersRows[0].c,
        openJobs: openJobsCountRows[0].total,
        closedJobs: closedJobsCountRows[0].total
      },
      openTenders:openTendersRows,
      openJobs:currentListingRows,
      statusCounts: statusCounts[0],
      categoryStatusCounts, // <— send grouped data to frontend
      user,
      category,
      message,
      status
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error in Dashboard");
  }
};


// client
exports.dashboardc = async (req, res) => {
  try {
    const [adminsRows] = await db.query("SELECT COUNT(*) as c FROM admins");
    const [clientsRows] = await db.query("SELECT COUNT(*) as c FROM clients");
    const [suppliersRows] = await db.query("SELECT COUNT(*) as c FROM suppliers");
 
// open bids
const [openTendersRows] = await db.query(`
  SELECT 
    j.client,
    j.bid_title,
    j.closing_datetime,
    j.eligibility,
    j.status,
    c.category_no,
    c.category_name,
    c.price,
    c.description,
    u.file
  FROM jobs j
  JOIN categories c 
    ON j.id = c.job_id
  LEFT JOIN uploads u 
    ON c.job_id = u.job_id 
    AND c.category_name = u.category
  WHERE j.status = 'open'
  ORDER BY j.closing_datetime ASC
`);
// draft bids
const [draftTendersRows] = await db.query(`
  SELECT 
    j.client,
    j.bid_title,
    j.closing_datetime,
    j.eligibility,
    j.status,
    c.category_no,
    c.category_name,
    c.price,
    c.description,
    u.file
  FROM jobs j
  JOIN categories c 
    ON j.id = c.job_id
  LEFT JOIN uploads u 
    ON c.job_id = u.job_id 
    AND c.category_name = u.category
  WHERE j.status = 'draft'
  ORDER BY j.closing_datetime ASC
`);

//current listing jobs
const [currentListingRows] = await db.query(`
SELECT 
    j.id AS job_id,
    j.client,
    j.reason,
    j.bid_title,
    j.closing_datetime,
    j.eligibility,
    j.status,
    c.category_no,
    c.category_name,
    c.price,
    c.description,
    u.file
  FROM jobs j
  JOIN categories c 
    ON j.id = c.job_id
  LEFT JOIN uploads u 
    ON c.job_id = u.job_id 
    AND c.category_name = u.category
  WHERE j.status IN ('approved','rejected')
  ORDER BY j.closing_datetime ASC
`);
   

      
  // ✅ Count tenders per category and status
const [categoryStatusCounts] = await db.query(`
  SELECT 
    category,
    SUM(CASE WHEN status = 'Draft' THEN 1 ELSE 0 END) AS Draft,
    SUM(CASE WHEN status = 'Open' THEN 1 ELSE 0 END) AS Open,
    SUM(CASE WHEN status = 'Closed' THEN 1 ELSE 0 END) AS Closed,
    SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) AS Rejected,
    SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) AS Approved
  FROM tenders
  GROUP BY category
  ORDER BY COUNT(id) DESC
`);


    // Count total by status for pie chart
    const [statusCounts] = await db.query(`
      SELECT 
        SUM(CASE WHEN status = 'Draft' THEN 1 ELSE 0 END) AS Draft,
        SUM(CASE WHEN status = 'Open' THEN 1 ELSE 0 END) AS Open,
        SUM(CASE WHEN status = 'Closed' THEN 1 ELSE 0 END) AS Closed,
        SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) AS Rejected,
        SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) AS Approved
      FROM jobs
    `);
    // Get open jobs (open or draft tenders)
  const [openJobsCountRows] = await db.query(
      "SELECT COUNT(*) as total FROM jobs WHERE status = 'approved'"
    );
    // draftJObs
      const [draftJobs] = await db.query(
      "SELECT COUNT(*) as total FROM jobs WHERE status = 'draft'"
    );

    // approved jobs
         const [approvedJobs] = await db.query(
      "SELECT COUNT(*) as total FROM jobs WHERE status = 'approved'"
    );
    // Get closed jobs (closed tenders)
     const [closedJobsCountRows] = await db.query(
      "SELECT COUNT(*) as total FROM tenders WHERE status = 'closed'"
    );

  const [category] = await db.query("SELECT * FROM categories");
    const user = req.session.user || { person: "Guest" };

    // Pull flash message then clear it
    const message = req.session.message || null;
    const status = req.session.status || null;
    req.session.message = null;
    req.session.status = null;

    res.render("dashcl", {
      totals: {
        admins: adminsRows[0].c,
        clients: clientsRows[0].c,
        draft:draftJobs[0].total,
        approved:approvedJobs[0].total,
        suppliers: suppliersRows[0].c,
        openJobs: openJobsCountRows[0].total,
        closedJobs: closedJobsCountRows[0].total
      },
     // closed tenders
      openTenders: openTendersRows,
      draftbids:draftTendersRows,
      openJobs:currentListingRows,
      statusCounts: statusCounts[0],
      categoryStatusCounts,
      category,
      user,
      message,
      status
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error in Dashboard");
  }
};

exports.permissionsList = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM permissions ORDER BY created_at DESC');
    res.render('permissions', { permissions: rows });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error in Permissions');
  }
};

exports.createPermission = async (req, res) => {
  try {
    const { name, description } = req.body;
    await db.query('INSERT INTO permissions (name, description) VALUES (?, ?)', [name, description]);
    res.redirect('/admin/permissions');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error creating permission');
  }
};

// create user
exports.createUser = async (req, res) => {
  try {
    const { name, person, email, pass, confirm_pass, role } = req.body;

    // 1. Validate input
    if (!name || !person || !email || !pass || !confirm_pass || !role) {
      return res.render("home", { message: "All fields are required", status: "error" });
    }

    if (pass !== confirm_pass) {
      return res.render("home", { message: "Passwords do not match", status: "error" });
    }

    if (!["supplier", "buyer"].includes(role.toLowerCase())) {
      return res.render("home", { message: "Invalid role", status: "error" });
    }

    // 2. Check if user already exists
    const [existing] = await db.query(
      "SELECT * FROM suppliers WHERE email = ? UNION SELECT * FROM clients WHERE email = ?",
      [email, email]
    );
    if (existing.length > 0) {
      return res.render("home", { message: "Email already registered", status: "error" });
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(pass, 10);

    // 4. Generate verification token
    const token = crypto.randomBytes(32).toString("hex");

    // 5. Decide table
    let table = role.toLowerCase() === "supplier" ? "suppliers" : "clients";

    await db.query(
      `INSERT INTO ${table} (name, person, email, pass, verified, verification_token,role) VALUES (?, ?, ?, ?, ?, ?,?)`,
      [name, person, email, hashedPassword, 0, token,role]
    );

    // 6. Send verification email
    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
      }
    });

    const verifyLink = `http://localhost:3000/verify/${token}`;

    await transporter.sendMail({
      from: {
        name: "EazyProcure",
        address: process.env.GMAIL_USER
      },
      to: email,
      subject: "Verify your Eazyprocure account",
      html: `
     <h4>Hello ${name},</h4>
        <p>Thank you for registering with us.</p>
        <p>Please click the link below to verify your account:</p>
        <a href="${verifyLink}" target="_blank" style="color:#1a73e8;">
          Verify Account
        </a>
        <p>If you didn’t request this, you can safely ignore this email.</p>
      `
    });

    // Success
    res.render("home", { message: "User created. Please verify your email.", status: "success" });
    console.log("Rendering home with:", { message: "User created. Please verify your email.", status: "success" });
  } catch (err) {
    console.error(err);
    res.render("home", { message: "Server error. Please try again later.", status: "error" });
  }
};


// Email verification route
exports.verifyUser = async (req, res) => {
  try {
    const { token } = req.params;

    // Check supplier table
    let [supplier] = await db.query("SELECT * FROM suppliers WHERE verification_token = ?", [token]);
    if (supplier.length > 0) {
      await db.query("UPDATE suppliers SET verified = 1, verification_token = NULL WHERE verification_token = ?", [token]);
      return res.render("home", { 
        message: "Supplier account verified successfully!", 
        status: "success" 
      });
    }

    // Check clients table
    let [client] = await db.query("SELECT * FROM clients WHERE verification_token = ?", [token]);
    if (client.length > 0) {
      await db.query("UPDATE clients SET verified = 1, verification_token = NULL WHERE verification_token = ?", [token]);
      return res.render("home", { 
        message: "Client account verified successfully!", 
        status: "success" 
      });
    }

    // If no match found
    return res.render("home", { 
      message: "Invalid or expired verification link.", 
      status: "error" 
    });
  } catch (err) {
    console.error(err);
    res.render("home", { 
      message: "Server error. Please try again later.", 
      status: "error" 
    });
  }
};


exports.loginUser = async (req, res) => {
  const { email, pass } = req.body;

  try {
    let user = null;
    let source = null;
    let reg_id = null; // 🧩 new variable to hold registration ID

    // 1️⃣ Check Admins
    const [adminRows] = await db.query("SELECT * FROM admins WHERE email = ?", [email]);
    if (adminRows.length > 0) {
      user = adminRows[0];
      source = "admin";
    }

    // 2️⃣ Check Suppliers
    if (!user) {
      const [supplierRows] = await db.query("SELECT * FROM suppliers WHERE email = ?", [email]);
      if (supplierRows.length > 0) {
        user = supplierRows[0];
        source = "supplier";
      }
    }

    // 3️⃣ Check Clients
    if (!user) {
      const [clientRows] = await db.query("SELECT * FROM clients WHERE email = ?", [email]);
      if (clientRows.length > 0) {
        user = clientRows[0];
        source = "client";
      }
    }

    // ❌ No match
    if (!user) {
      return res.render("home", {
        message: "Invalid email or password",
        status: "error",
      });
    }

    // 🔐 Check password
    const isMatch = await bcrypt.compare(pass, user.pass);
    if (!isMatch) {
      return res.render("home", {
        message: "Invalid email or password",
        status: "error",
      });
    }

    // 📧 Check verification
    if (!user.verified) {
      return res.render("home", {
        message: "Please verify your email first",
        status: "error",
      });
    }

    // 🧩 Retrieve reg_id from registration table
    const [regRows] = await db.query(
      "SELECT id AS reg_id FROM registration WHERE email = ? ORDER BY id DESC LIMIT 1",
      [user.email]
    );

    if (regRows.length > 0) {
      reg_id = regRows[0].reg_id;
    }

    // 💾 Save session
    req.session.user = {
      email: user.email,
      person: user.person,
      role: source,
      reg_id: reg_id || null, // store reg_id in session
    };

    await new Promise((resolve, reject) => {
      req.session.save((err) => (err ? reject(err) : resolve()));
    });

    console.log(`✅ Logged in as ${user.person} (${source}), reg_id: ${reg_id}`);

    // 🔀 Redirect based on table source
    if (source === "admin") return res.redirect("/dashboard");
    if (source === "supplier") return res.redirect("admin/dashsup");
    if (source === "client") return res.redirect("admin/dashcl");

  } catch (err) {
    console.error("❌ Login error:", err);
    return res.render("home", {
      message: "Server error",
      status: "error",
    });
  }
};

// fetch admins
exports.admins = (req, res) => {
  db.query("SELECT * FROM admins")
    .then(([results]) => {
      console.log("Fetched admins:", results);
      res.render("super", { admins: results });
      console.log("Sample supplier:", results[0]);
console.log("Type of verified:", typeof results[0].verified);

    })
    .catch((error) => {
      console.error("Error fetching suppliers:", error);
      res.status(500).send("Error fetching suppliers");
    });
};

// Fetch all suppliers
exports.suppliers = (req, res) => {
  db.query("SELECT * FROM suppliers")
    .then(([results]) => {
      console.log("Fetched suppliers:", results);
      res.render("supplier", { suppliers: results });
      console.log("Sample supplier:", results[0]);
console.log("Type of verified:", typeof results[0].verified);

    })
    .catch((error) => {
      console.error("Error fetching suppliers:", error);
      res.status(500).send("Error fetching suppliers");
    });
};

//Fetch clients
exports.clients = (req, res) => {
  db.query("SELECT * FROM clients")
    .then(([results]) => {
      console.log("Fetched suppliers:", results);
      res.render("client", { clients: results });
    })
    .catch((error) => {
      console.error("Error fetching suppliers:", error);
      res.status(500).send("Error fetching suppliers");
    });
};
//admin
exports.createAdmin = async (req, res) => {
  try {
    console.log("🟢 Route hit: /sups");
    console.log("🟠 req.body:", req.body);
    console.log("🟣 req.file:", req.file);

    const { name, email, tel, Password, cPassword } = req.body;

    // 1️⃣ Basic validation
    if (!name || !email || !Password || !cPassword) {
      return res.render("super", {
        message: "All required fields must be filled",
        status: "error",
      });
    }

    if (Password !== cPassword) {
      return res.render("super", {
        message: "Passwords do not match",
        status: "error",
      });
    }

    // 2️⃣ Check if email already exists
    const [existingAdmins] = await db.query(
      "SELECT * FROM admins WHERE email = ?",
      [email]
    );

    if (existingAdmins.length > 0) {
      return res.render("super", {
        message: "An administrator with this email already exists.",
        status: "error",
      });
    }

    // 3️⃣ Hash password
    const hashedPassword = await bcrypt.hash(Password, 10);

    // 4️⃣ Save profile picture
    const profilePic = req.file ? req.file.filename : null;

    // 5️⃣ Generate verification token
    const token = crypto.randomBytes(32).toString("hex");

    // 6️⃣ Insert new admin into database
    const insertSQL = `
      INSERT INTO admins (profile, person, email, tel, pass, verification_token)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    await db.query(insertSQL, [
      profilePic,
      name,
      email,
      tel,
      hashedPassword,
      token,
    ]);

    // 7️⃣ Configure email transport
    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    // 8️⃣ Create verification link
    const verifyLink = `http://localhost:3000/verify/${token}`;

    // 9️⃣ Send verification email
    await transporter.sendMail({
      from: {
        name: "EazyProcure",
        address: process.env.GMAIL_USER,
      },
      to: email,
      subject: "Verify your EazyProcure Administrator Account",
      html: `
        <h4>Hello ${name},</h4>
        <p>Thank you for registering as an administrator.</p>
        <p>Please click the link below to verify your account:</p>
        <a href="${verifyLink}" target="_blank" style="color:#1a73e8;">
          Verify Account
        </a>
        <p>If you didn’t request this, you can safely ignore this email.</p>
      `,
    });

    //  🔟 Render success
    res.render("super", {
      message: "Administrator created successfully. Verification email sent.",
      status: "success",
    });
  } catch (err) {
    console.error("❌ Error inserting admin:", err);
    res.render("super", {
      message: "Server error while saving admin.",
      status: "error",
    });
  }
};

// new categories
exports.create_category = async (req, res) => {
  try {
    const { job_id, client, category_no, category_name, price, description } = req.body;

    if (!job_id || !client || !category_no || !category_name || !price || !description) {
      return res.status(400).send("All fields are required (including job ID).");
    }

    const [existing] = await db.query(
      "SELECT * FROM categories WHERE category_no = ? AND client = ? AND job_id = ?",
      [category_no, client, job_id]
    );

    if (existing.length > 0) {
      return res.status(400).send("Category already exists for this job.");
    }

    const [insertResult] = await db.query(
      "INSERT INTO categories (job_id, client, category_no, category_name, price, description) VALUES (?, ?, ?, ?, ?, ?)",
      [job_id, client, category_no, category_name, price, description]
    );

    res.redirect("/admin/preq");
  } catch (err) {
    console.error("🔥 Error in create_category:", err);
    res.status(500).send("Database error while creating category.");
  }
};
// rfqs
exports.createRFQ = async (req, res) => {
  try {
    const {
      title,
      specifications,
      delivery_timeline,
      payment_terms,
      item_description,
      quantity,
      unit_price,
      vat,
      total_price
    } = req.body;

    const jobId = req.session.jobId;
    if (!jobId) return res.status(400).send("Job ID missing in session.");

    if (!title || !item_description || item_description.length === 0) {
      return res.status(400).send("Title and at least one item are required.");
    }

    // Check if RFQ already exists for this job & title
    const [existing] = await db.query(
      "SELECT * FROM rfqs WHERE job_id = ? AND title = ?",
      [jobId, title]
    );

    if (existing.length > 0) {
      return res.status(400).send("❌ RFQ with this title already exists for this job.");
    }

    // Prepare rows for insertion
    const rows = item_description.map((desc, i) => [
      jobId,
      specifications,
      title,
      parseFloat(quantity[i]),
      parseFloat(unit_price[i]),
      parseFloat(vat[i] || 0),
      parseFloat(total_price[i] || 0),
      delivery_timeline || null,
      payment_terms || null
    ]);

    const insertSql = `
      INSERT INTO rfqs 
        (job_id, specifications, title, quantity, unit_price, vat, total_price, delivery_timeline, payment_terms)
      VALUES ?
    `;

    await db.query(insertSql, [rows]);
        res.redirect('/admin/rfq')
   // return res.status(201).send("✅ RFQ and items created successfully!");
  } catch (err) {
    console.error("❌ Error creating RFQ:", err);
    return res.status(500).send("Server error while creating RFQ.");
  }
};


// rfp
exports.createRFP = async (req, res) => {
  try {
    const {
      p_title,
      template,
      description,
      duration,
      budget
      
    } = req.body;

    const jobId = req.session.jobId; // ✅ GET jobId from session

    console.log("SESSION JOB ID:", jobId);

    // Validate before inserting
    if (!jobId) {
      return res.status(400).send("❌ No job found! Create a job first.");
    }

    // Handle files from multer
    const f_prop = req.files?.f_prop ? req.files.f_prop[0].filename : null;

    console.log("FILES RECEIVED:", req.files);

    if (!p_title || !template || !description|| !f_prop || !duration || !budget) {
      return res.status(400).send("❌ All fields are required.");
    }

    // Check if RFP already exists
    const [existing] = await db.query(
      "SELECT * FROM rfp_submissions WHERE p_title = ? AND job_id = ?",
      [p_title, jobId]
    );

    if (existing.length > 0) {
      return res.status(400).send("❌ RFP with this title already exists for this job.");
    }

    // INSERT RFP including jobId
    const insertSql = `
      INSERT INTO rfp_submissions 
      (job_id, p_title,template,description, f_prop, duration, budget)
      VALUES (?, ?, ?, ?, ?, ?,?)
    `;

    const [result] = await db.query(insertSql, [
      jobId,
      p_title,
      template,
      description,
      f_prop,
      duration,
      budget
    ]);

    console.log("✅ RFP created successfully:", result);

    // Redirect back to admin/rfp
    res.redirect("/admin/rfp");

  } catch (error) {
    console.error("❌ Error creating RFP:", error);
    res.status(500).send("Server error while creating RFP.");
  }
};


// eoi submission
exports.createEOI = async (req, res) => {
  try {
    const {name,experience,services,s_doc,interest  } = req.body;

    console.log("Received body:", req.body);

    // 🧩 Basic validation
    if (!name || !experience || !services || !s_doc || !interest ) {
      return res.status(400).send("❌ name,experience,services,s_doc,interest are required.");
    }

    // 🧩 Step 1: Check if RFQ already exists
    const [existing] = await db.query("SELECT * FROM eoi_submissions WHERE name = ?", [name]);

    if (existing.length > 0) {
      console.log("RFQ already exists:", existing[0]);
      return res.status(400).send("❌ EOI with this title already exists.");
    }

    // 🧩 Step 2: Insert new RFQ
    const insertSql = `
      INSERT INTO eoi_submissions 
      (name,experience,services,s_doc,interest)
      VALUES (?, ?, ?, ?, ?)
    `;

    const [result] = await db.query(insertSql, [name,experience,services,s_doc,interest   ]);

    console.log("✅ EOI created successfully:", result);
    res.status(201).send("✅ EOI created successfully!");
  

  } catch (error) {
    console.error("❌ Error creating EOI:", error);
    res.status(500).send("Server error while creating EOI.");
  }
};


//rfi submission
exports.createRFIB = async (req, res) => {
  try {
    const {title,details,supplier,deadline} = req.body;

    console.log("Received body:", req.body);

    // 🧩 Basic validation
    if (!title || !details || !supplier || !deadline ) {
      return res.status(400).send("❌title,details,supplier,deadline.");
    }

    // 🧩 Step 1: Check if RFQ already exists
    const [existing] = await db.query("SELECT * FROM rfi_buyer WHERE title = ?", [title]);

    if (existing.length > 0) {
      console.log("RFI already exists:", existing[0]);
      return res.status(400).send("❌ RFI with this title already exists.");
    }

    // 🧩 Step 2: Insert new RFQ
    const insertSql = `
      INSERT INTO rfi_buyer 
      (title,details,supplier,deadline)
      VALUES (?, ?, ?, ?)
    `;

    const [result] = await db.query(insertSql, [title,details,supplier,deadline]);

    console.log("✅ RFI created successfully:", result);
    res.status(201).send("✅ RFI created successfully!");
  

  } catch (error) {
    console.error("❌ Error creating RFI:", error);
    res.status(500).send("Server error while creating RFI.");
  }
};

// rfi supplier  cname,details,info,docs

exports.createRFIS = async (req, res) => {
  try {
    const {cname,details,info,docs} = req.body;

    console.log("Received body:", req.body);

    // 🧩 Basic validation
    if (!cname || !details || !info || !docs ) {
      return res.status(400).send("❌cname,details,info,docs");
    }

    // 🧩 Step 1: Check if RFQ already exists
    const [existing] = await db.query("SELECT * FROM rfi_supplier WHERE cname = ?", [cname]);

    if (existing.length > 0) {
      console.log("RFI already exists:", existing[0]);
      return res.status(400).send("❌ RFI with this title already exists.");
    }

    // 🧩 Step 2: Insert new RFQ
    const insertSql = `
      INSERT INTO rfi_supplier
      (cname,details,info,docs)
      VALUES (?, ?, ?, ?)
    `;

    const [result] = await db.query(insertSql, [cname,details,info,docs]);

    console.log("✅ RFI created successfully:", result);
    res.status(201).send("✅ RFI created successfully!");
    

  } catch (error) {
    console.error("❌ Error creating RFI:", error);
    res.status(500).send("Server error while creating RFI.");
  }
};
 
// create tender
exports.createTender = async (req, res) => {
  try {
    const { category,code, title, type, closingDate, status, description } = req.body;

    console.log("Received body:", req.body);

    // 🧩 Basic validation
    if (!category || !code || !title || !type || !closingDate || !status || !description) {
      return res.status(400).send("❌ Missing required fields: code, title, type, closingDate, status, description");
    }

    // 🧩 Step 1: Check if tender already exists
    const [existing] = await db.query("SELECT * FROM tenders WHERE code = ?", [code]);

    if (existing.length > 0) {
      console.log("Tender already exists:", existing[0]);
      return res.status(400).send("❌ A tender with this code already exists.");
    }

    // 🧩 Step 2: Insert new tender
    const insertSql = `
      INSERT INTO tenders
      (category,code, title, type,closing_date, status,description)
      VALUES (?, ?, ?, ?, ?, ?,?)
    `;

    const [result] = await db.query(insertSql, [
      category,
      code,
      title,
      type,
      closingDate,
      status,
      description,
    ]);

    console.log("✅ Tender created successfully:", result);
    res.status(201).send("✅ Tender created successfully!");
  

  } catch (error) {
    console.error("❌ Error creating tender:", error);
    res.status(500).send("Server error while creating tender.");
  }
};

// receive alerts
exports.createAlert = async (req, res) => {
  try {
    const { category,frequency, email } = req.body;

    console.log("Received body:", req.body);

    // 🧩 Basic validation
    if (!category || !frequency || !email ) {
      return res.status(400).send("❌ Missing required fields: category,frequency, email");
    }

    // 🧩 Step 1: Check if tender already exists
    const [existing] = await db.query("SELECT * FROM alerts WHERE category = ? AND email = ?", [category,email]);

    if (existing.length > 0) {
      console.log("Alert for this category already exists:", existing[0]);
      return res.status(400).send("❌ Alert with this code already exists.");
    }

    // 🧩 Step 2: Insert new tender
    const insertSql = `
      INSERT INTO alerts
      (category,frequency, email)
      VALUES (?, ?, ?)
    `;

    const [result] = await db.query(insertSql, [category,frequency, email]);

    console.log("✅ You have successfully! subscribe for this alerts:", result);
    res.status(201).send("✅ You have successfully! subscribe for this alerts");
   

  } catch (error) {
    console.error("❌ Error creating Alert:", error);
    res.status(500).send("Server error while creating Alert.");
  }
};

// create a notification
exports.createNotification = async (req, res) => {
  try {
    const { sender,title,type,msg } = req.body;

    console.log("Received body:", req.body);

    // 🧩 Basic validation
    if (!sender || !title || !type || !msg ) {
      return res.status(400).send("❌ Missing required fields: sender,title,type,msg");
    }

    // 🧩 Step 1: Check if tender already exists
    const [existing] = await db.query("SELECT * FROM notification WHERE title = ?", [title]);

    if (existing.length > 0) {
      console.log("This Notification  already exists:", existing[0]);
      return res.status(400).send("❌ A Notification  with this code already exists.");
    }

    // 🧩 Step 2: Insert new tender
    const insertSql = `
      INSERT INTO notification
      (sender,title,type,msg)
      VALUES (?, ?, ?,?)
    `;

    const [result] = await db.query(insertSql, [sender,title,type,msg]);

    console.log("✅ You have successfully! created a notification:", result);
    res.status(201).send("✅ You have successfully! created a notification");
   

  } catch (error) {
    console.error("❌ Error creating notification:", error);
    res.status(500).send("Server error while creating notification.");
  }
};
// create registration details
exports.createRegDetails = async (req, res) => {
  try {
    const {
      cname,
      email,
      website,
      tel,
      country,
      county,
      subcounty,
      entity,
      profile,
    } = req.body;

    console.log(req.body);

    // Validation
    if (!cname || !email || !tel || !country || !county || !subcounty || !entity || !profile) {
      return res.status(400).json({
        status: "error",
        message: "All required fields must be filled.",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid email format.",
      });
    }

    const phoneRegex = /^\+?\d{9,15}$/;
    if (!phoneRegex.test(tel)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid phone number format.",
      });
    }

    // Check if company already exists
    const [existing] = await db.query(
      "SELECT * FROM registration WHERE email = ? OR cname = ?",
      [email, cname]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        status: "error",
        message: "A company with this name or email already exists.",
      });
    }

    // Insert new registration details
    const [result] = await db.query(
      `INSERT INTO registration 
      (cname, email, website, tel, country, county, subcounty, entity, profile) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [cname, email, website, tel, country, county, subcounty, entity, profile]
    );

    // ✅ Store the inserted ID in session
    req.session.reg_id = result.insertId;
    console.log("✅ Stored registration ID in session:", req.session.reg_id);

    // ✅ Return success
    res.status(200).json({
      status: "success",
      message: "Company registration details submitted successfully.",
      reg_id: result.insertId, // Optional: send back to client if needed
    });
  } catch (err) {
    console.error("Error saving registration:", err);
    res.status(500).json({
      status: "error",
      message: "Server error while processing registration.",
    });
  }
};

// upload statutory
exports.createStatutory = async (req, res) => {
  try {
    const { coi, crn, sad, nod, kra, tcc, tcno, expd, permit, agpo } = req.body;

    console.log("Received body:", req.body);

    // Check session for reg_id
    const reg_id = req.session.reg_id;
    if (!reg_id) {
      return res.status(400).json({
        status: "error",
        message: "Missing registration reference. Please complete registration first.",
      });
    }

    // Validation
    if (!coi || !crn || !sad || !nod || !kra || !tcc || !tcno || !permit || !expd || !agpo) {
      return res.status(400).send(
        "❌ Missing required fields: coi, crn, sad, nod, kra, tcc, tcno, permit, expd, agpo"
      );
    }

    // Check for duplicates
    const [existing] = await db.query("SELECT * FROM statutory WHERE kra = ?", [kra]);
    if (existing.length > 0) {
      console.log("This information already exists:", existing[0]);
      return res.status(400).send("❌ Information with this KRA already exists.");
    }

    // Insert new statutory info linked to registration
    const insertSql = `
      INSERT INTO statutory
      (reg_id, coi, crn, sad, nod, kra, tcc, tcc_no, bs_permit, expd, agpo_category)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.query(insertSql, [
      reg_id,
      coi,
      crn,
      sad,
      nod,
      kra,
      tcc,
      tcno,
      permit,
      expd,
      agpo,
    ]);

    console.log("✅ Statutory info inserted successfully:", result);

    res.status(201).json({
      status: "success",
      message: "✅ Statutory information submitted successfully and linked to registration.",
      reg_id,
    });
  } catch (error) {
    console.error("❌ Error creating information:", error);
    res.status(500).send("Server error while creating information.");
  }
};
// compliance
exports.createCompliance = async (req, res) => {
  try {
    const tableName = "compliance";
    const formData = req.body;
    const reg_id = req.session.reg_id; // get from session

    if (!reg_id) {
      console.error("❌ reg_id not found in session.");
      return res.status(400).send("Missing registration reference (reg_id).");
    }

    if (!formData || Object.keys(formData).length === 0) {
      return res.status(400).send("No form data received.");
    }

    // STEP 1: Check if compliance table exists
    const [tableExists] = await db.query("SHOW TABLES LIKE ?", [tableName]);

    // STEP 2: Create table if not exists
    if (tableExists.length === 0) {
      // add reg_id as a permanent column
      let columns = ["reg_id INT"];
      columns.push(
        ...Object.keys(formData).map((key) => `\`${key}\` TEXT`)
      );

      const createTableSQL = `
        CREATE TABLE \`${tableName}\` (
          id INT AUTO_INCREMENT PRIMARY KEY,
          ${columns.join(", ")},
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;
      await db.query(createTableSQL);
      console.log("✅ Created new table:", tableName);
    } else {
      // STEP 3: Check existing columns
      const [existingCols] = await db.query("SHOW COLUMNS FROM ??", [tableName]);
      const existingNames = existingCols.map((c) => c.Field);

      // ensure reg_id column exists
      if (!existingNames.includes("reg_id")) {
        await db.query(`ALTER TABLE \`${tableName}\` ADD COLUMN reg_id INT;`);
        console.log("🆕 Added column 'reg_id' to compliance table");
      }

      // STEP 4: Add any new dynamic fields
      for (const key of Object.keys(formData)) {
        if (!existingNames.includes(key)) {
          await db.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${key}\` TEXT;`);
          console.log(`🆕 Added new column '${key}' to ${tableName}`);
        }
      }
    }

    // STEP 5: Validate data
    const validData = {};
    for (const [key, value] of Object.entries(formData)) {
      if (value !== undefined && value !== null && value !== "") {
        validData[key] = value;
      }
    }

    // Always include reg_id
    validData.reg_id = reg_id;

    // STEP 6: Insert data
    const fields = Object.keys(validData)
      .map((f) => `\`${f}\``)
      .join(", ");
    const placeholders = Object.keys(validData)
      .map(() => "?")
      .join(", ");
    const values = Object.values(validData);

    const insertSQL = `
      INSERT INTO \`${tableName}\` (${fields})
      VALUES (${placeholders})
    `;

    const [result] = await db.query(insertSQL, values);

    console.log("✅ Compliance data saved:", validData);

    // Return or redirect with inserted ID
    const insertedId = result.insertId;
    console.log("🆔 New compliance record ID:", insertedId);

    // Option 1: redirect with success message
    res.redirect("/admin/doc");

    // Option 2 (alternative): send JSON
    // res.json({ message: "Compliance data saved successfully", insertedId });

  } catch (err) {
    console.error("❌ Error in createCompliance:", err);
    res.status(500).send("Server error while saving compliance data.");
  }
};

// create new job - preqqual
exports.createNewJob = async (req, res) => {
  try {
    const { client, bid_title, start_datetime, closing_datetime, eligibility } = req.body;

    // Validate form data
    if (!client || !bid_title || !start_datetime || !closing_datetime) {
      return res.status(400).send("All fields are required.");
    }

    // Check if job already exists
    const [existingJob] = await db.query(
      "SELECT * FROM jobs WHERE client = ? AND bid_title = ?",
      [client, bid_title]
    );

    if (existingJob.length > 0) {
      console.log("⚠️ Job already exists:", bid_title);
      return res.status(409).send("Job with this title already exists for the selected client.");
    }

    // Insert new job and get inserted ID
    const sql = `
      INSERT INTO jobs (client, bid_title, start_datetime, closing_datetime, eligibility, status)
      VALUES (?, ?, ?, ?, ?, 'draft')
    `;
    const [result] = await db.query(sql, [
      client,
      bid_title,
      start_datetime,
      closing_datetime,
      eligibility,
    ]);

    const newJobId = result.insertId;
    console.log(`✅ New job created: ${bid_title} (ID: ${newJobId}) for ${client}`);

    // ✅ Store job ID in session
    req.session.jobId = newJobId;
    req.session.jobTitle = bid_title;
    req.session.client = client;

    console.log("🧠 Stored in session:", {
      jobId: req.session.jobId,
      jobTitle: req.session.jobTitle,
      client: req.session.client,
    });

    // Redirect after success
    res.redirect("/admin/preq");

  } catch (err) {
    console.error("❌ Error creating new job:", err.message);
    res.status(500).send("Server error: " + err.message);
  }
};

// create new job - rfq
exports.createNewJobRfq = async (req, res) => {
  try {
    const { client, bid_title, start_datetime, closing_datetime, eligibility } = req.body;

    // Validate form data
    if (!client || !bid_title || !start_datetime || !closing_datetime) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }

    // Check if job already exists
    const [existingJob] = await db.query(
      "SELECT * FROM jobs WHERE client = ? AND bid_title = ?",
      [client, bid_title]
    );

    if (existingJob.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Job with this title already exists for the selected client."
      });
    }

    // Insert new job
    const sql = `
      INSERT INTO jobs (client, bid_title, start_datetime, closing_datetime, eligibility, status)
      VALUES (?, ?, ?, ?, ?, 'draft')
    `;
    const [result] = await db.query(sql, [
      client,
      bid_title,
      start_datetime,
      closing_datetime,
      eligibility,
    ]);

    const newJobId = result.insertId;

    // Store session
    req.session.jobId = newJobId;
    req.session.jobTitle = bid_title;
    req.session.client = client;

res.redirect("/admin/rfq");


  } catch (err) {
    console.error("❌ Error creating new job:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// create new job - rfp
exports.createNewJobRfp= async (req, res) => {
  try {
    const { client, bid_title, start_datetime, closing_datetime, eligibility } = req.body;

    // Validate form data
    if (!client || !bid_title || !start_datetime || !closing_datetime) {
      return res.status(400).send("All fields are required.");
    }

    // Check if job already exists
    const [existingJob] = await db.query(
      "SELECT * FROM jobs WHERE client = ? AND bid_title = ?",
      [client, bid_title]
    );

    if (existingJob.length > 0) {
      console.log("⚠️ Job already exists:", bid_title);
      return res.status(409).send("Job with this title already exists for the selected client.");
    }

    // Insert new job and get inserted ID
    const sql = `
      INSERT INTO jobs (client, bid_title, start_datetime, closing_datetime, eligibility, status)
      VALUES (?, ?, ?, ?, ?, 'draft')
    `;
    const [result] = await db.query(sql, [
      client,
      bid_title,
      start_datetime,
      closing_datetime,
      eligibility,
    ]);

    const newJobId = result.insertId;
    console.log(`✅ New job created: ${bid_title} (ID: ${newJobId}) for ${client}`);

    // ✅ Store job ID in session
    req.session.jobId = newJobId;
    req.session.jobTitle = bid_title;
    req.session.client = client;

    console.log("🧠 Stored in session:", {
      jobId: req.session.jobId,
      jobTitle: req.session.jobTitle,
      client: req.session.client,
    });

    // Redirect after success
    res.redirect("/admin/rfp");

  } catch (err) {
    console.error("❌ Error creating new job:", err.message);
    res.status(500).send("Server error: " + err.message);
  }
};

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Folder to store uploaded files
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Exported middleware for route
exports.uploadFile = upload.single("excelFile");

// Main upload handler
exports.multiUpload = async (req, res) => {
  try {
    console.log("🟢 Route hit: /multi_upload");

    const { client } = req.body;
    const filePath = req.file?.path;
    const job_id = req.session.jobId; // ✅ Get job ID from session

    console.log("🧠 Job ID from session:", job_id);

    if (!job_id || !client || !filePath) {
      return res.status(400).send("Job ID, Client, and file are required.");
    }

    // Read Excel file
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);

    if (data.length === 0) {
      return res.status(400).send("Excel file is empty.");
    }

    // Track inserted & skipped
    let insertedCount = 0;
    let skippedCount = 0;

    for (const row of data) {
      const { category_no, category_name, price, description } = row;

      if (!category_no || !category_name || !price) continue;

      // Check if category already exists for this job + client + category_no
      const [existing] = await db.query(
        `SELECT id FROM categories WHERE job_id = ? AND client = ? AND category_no = ?`,
        [job_id, client, category_no]
      );

      if (existing.length > 0) {
        skippedCount++;
        continue; // Skip duplicates
      }

      // Insert new category with job_id
      await db.query(
        `INSERT INTO categories (job_id, client, category_no, category_name, price, description)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [job_id, client, category_no, category_name, price, description || ""]
      );

      insertedCount++;
    }

    console.log(`✅ Upload completed! ${insertedCount} new categories added, ${skippedCount} duplicates skipped.`);

    res.redirect("/admin/preq");

  } catch (error) {
    console.error("❌ Upload error:", error);
    res.status(500).send("Error uploading file: " + error.message);
  }
};

// --- MAIN FUNCTION ---
exports.createQuiz = [
  upload.single('file'),

  async (req, res) => {
    try {
      const { job_id, category } = req.body; // ✅ include job_id
      const file = req.file;

      console.log("🟢 Received:", { job_id, category, file });

      // ✅ Validation
      if (!job_id || !category || !file)
        return res.status(400).send('⚠️ Missing job_id, category, or file.');

      // ✅ Check file type
      const ext = path.extname(file.originalname).toLowerCase();
      if (!['.xls', '.xlsx'].includes(ext))
        return res.status(400).send('⚠️ Invalid file type. Upload Excel only.');

      // ✅ Check if already uploaded for this job and category
      const [exists] = await db.query(
        'SELECT * FROM uploads WHERE job_id = ? AND category = ?',
        [job_id, category]
      );
      if (exists.length > 0)
        return res.status(200).send(`⚠️ Excel for category "${category}" already uploaded for this job.`);

      // ✅ Parse Excel
      const workbook = xlsx.readFile(file.path);
      const sheetName = workbook.SheetNames[0];
      const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
      if (sheetData.length === 0)
        return res.status(400).send('⚠️ Excel file is empty.');

      // ✅ Insert upload record into DB
      await db.query(
        'INSERT INTO uploads (job_id, category, file) VALUES (?, ?, ?)',
        [job_id, category, file.filename]
      );

      res.status(200).send(`✅ "${file.originalname}" uploaded successfully for category "${category}".`);
    } catch (error) {
      console.error('❌ Server error:', error);
      res.status(500).send('❌ Server error occurred.');
    }
  }
];























//logout
exports.logoutUser = (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error(err);
    res.redirect("/");
  });
};



