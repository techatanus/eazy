const db = require('../config/db');
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const multer = require("multer");
const { resolveSoa } = require('dns');



exports.dashboard = async (req, res) => {
  try {
    const [adminsRows] = await db.query("SELECT COUNT(*) as c FROM admins");
    const [clientsRows] = await db.query("SELECT COUNT(*) as c FROM clients");
    const [suppliersRows] = await db.query("SELECT COUNT(*) as c FROM suppliers");
    const [openTendersRows] = await db.query(
      "SELECT * FROM tenders WHERE status IN ('open', 'Draft') ORDER BY closing_date ASC LIMIT 10" );

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
        suppliers: suppliersRows[0].c
      },
      openTenders: openTendersRows,
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

// exports.rolesList = async (req, res) => {
//   try {
//     const [rows] = await db.query(
//       'SELECT r.*, u.name as created_by_name FROM roles r LEFT JOIN admins u ON r.created_by=u.id'
//     );
//     res.render('role', { roles: rows });
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Server Error in Roles');
//   }
// };

// exports.createRole = async (req, res) => {
//   try {
//     const { name, description, is_admin, is_supervised } = req.body;
//     await db.query(
//       'INSERT INTO roles (name, description, is_admin, is_supervised, created_by) VALUES (?, ?, ?, ?, ?)',
//       [name, description, is_admin ? 1 : 0, is_supervised ? 1 : 0, req.session.adminId || 1]
//     );
//     res.redirect('/admin/role');
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Error creating role');
//   }
// };

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
      `INSERT INTO ${table} (name, person, email, pass, verified, verification_token) VALUES (?, ?, ?, ?, ?, ?)`,
      [name, person, email, hashedPassword, 0, token]
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


// Login check (must be verified)
exports.loginUser = async (req, res) => {
  const { email, pass } = req.body;

  try {
    // Find user in suppliers or clients
let [user] = await db.query(
  `
  SELECT email, pass,person, verified FROM admins WHERE email = ?
  UNION
  SELECT email, pass,person, verified FROM suppliers WHERE email = ?
  UNION
  SELECT email, pass,person, verified FROM clients WHERE email = ?
  `,
  [email, email, email]
);

    if (user.length === 0) {
      return res.render("home", { 
        message: "Invalid email or password", 
        status: "error" 
      });
    }

    user = user[0];
    req.session.user = user;

    if (!user.verified) {
      return res.render("home", { 
        message: "Please verify your email first", 
        status: "error" 
      });
    }

    const isMatch = await bcrypt.compare(pass, user.pass);
    if (!isMatch) {
      return res.render("home", { 
        message: "Invalid email or password", 
        status: "error" 
      });
    }

    console.log("Logged in as:", user.person);

    // ✅ On success, redirect to dashboard
    res.redirect("/dashboard");

  } catch (err) {
    console.error(err);
    res.render("home", { 
      message: "Server error", 
      status: "error" 
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
    console.log("🟢 Route hit: /create_category");

    const { category_no, category_name, price, description } = req.body;
    console.log("🟠 Received body:", req.body);

    if (!category_no || !category_name || !price || !description) {
      console.log("🔴 Validation failed");
      return res.status(400).send("All fields are required.");
    }

    // Check if category exists
    const [existing] = await db.query("SELECT * FROM categories WHERE category_no = ?", [category_no]);
    console.log("🟡 Existing category check:", existing);

    if (existing.length > 0) {
      console.log("⚠️ Category already exists.");
      return res.status(400).send("Category already exists.");
    }

    // Insert new category
    const [insertResult] = await db.query(
      "INSERT INTO categories (category_no, category_name, price, description) VALUES (?, ?, ?, ?)",
      [category_no, category_name, price, description]
    );

    console.log("✅ Insert successful:", insertResult);
    return res.status(200).send("Category created successfully!");
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
      quantity,
      unit_price,
      vat,
      total_price,
      delivery_timeline,
      payment_terms
    } = req.body;

    console.log("Received body:", req.body);

    // 🧩 Basic validation
    if (!title || !quantity || !unit_price) {
      return res.status(400).send("❌ Title, Quantity, and Unit Price are required.");
    }

    // 🧩 Step 1: Check if RFQ already exists
    const [existing] = await db.query("SELECT * FROM rfqs WHERE title = ?", [title]);

    if (existing.length > 0) {
      console.log("RFQ already exists:", existing[0]);
      return res.status(400).send("❌ RFQ with this title already exists.");
    }

    // 🧩 Step 2: Insert new RFQ
    const insertSql = `
      INSERT INTO rfqs 
      (title, specifications, quantity, unit_price, vat, total_price, delivery_timeline, payment_terms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.query(insertSql, [
      title,
      specifications,
      quantity,
      unit_price,
      vat,
      total_price,
      delivery_timeline,
      payment_terms
    ]);

    console.log("✅ RFQ created successfully:", result);
    res.status(201).send("✅ RFQ created successfully!");
    // or redirect: res.redirect("/rfqs");

  } catch (error) {
    console.error("❌ Error creating RFQ:", error);
    res.status(500).send("Server error while creating RFQ.");
  }
};

// rfp
exports.createRFP = async (req, res) => {
  try {
    const {
    p_title ,
    t_prop ,
    f_prop ,
    duration ,
    budget 
    } = req.body;

    console.log("Received body:", req.body);

    // 🧩 Basic validation
    if (!p_title || !t_prop || !f_prop || !duration || !budget ) {
      return res.status(400).send("❌ Title, Quantity, and Unit Price are required.");
    }

    // 🧩 Step 1: Check if RFQ already exists
    const [existing] = await db.query("SELECT * FROM rfp_submissions WHERE P_title = ?", [p_title]);

    if (existing.length > 0) {
      console.log("RFQ already exists:", existing[0]);
      return res.status(400).send("❌ RFP with this title already exists.");
    }

    // 🧩 Step 2: Insert new RFQ
    const insertSql = `
      INSERT INTO rfp_submissions 
      (p_title ,t_prop ,f_prop ,duration ,budget)
      VALUES (?, ?, ?, ?, ?)
    `;

    const [result] = await db.query(insertSql, [
    p_title ,
    t_prop ,
    f_prop ,
    duration ,
    budget 
    ]);

    console.log("✅ RFP created successfully:", result);
    res.status(201).send("✅ RFP created successfully!");
    // or redirect: res.redirect("/rfqs");

  } catch (error) {
    console.error("❌ Error creating RFQ:", error);
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
    // or redirect: res.redirect("/rfqs");

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
    // or redirect: res.redirect("/rfqs");

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
    // or redirect: res.redirect("/rfqs");

  } catch (error) {
    console.error("❌ Error creating RFI:", error);
    res.status(500).send("Server error while creating RFI.");
  }
};
 
// create tender
exports.createTender = async (req, res) => {
  try {
    const { code, title, type, closingDate, status, description } = req.body;

    console.log("Received body:", req.body);

    // 🧩 Basic validation
    if (!code || !title || !type || !closingDate || !status || !description) {
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
      (code, title, type,closing_date, status,description)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.query(insertSql, [
      code,
      title,
      type,
      closingDate,
      status,
      description,
    ]);

    console.log("✅ Tender created successfully:", result);
    res.status(201).send("✅ Tender created successfully!");
    // Optional redirect: res.redirect("/rfqs");

  } catch (error) {
    console.error("❌ Error creating tender:", error);
    res.status(500).send("Server error while creating tender.");
  }
};
