const express = require('express');
const router = express.Router();
const adminCtrl = require('../controllers/adminController');
const db = require('../config/db');
const multer = require("multer");
const fs = require('fs');
const path = require('path');

// Path to templates folder
const templatesDir = path.join(__dirname, '..', 'templates');

// Function to safely load a JSON file
function loadTemplate(fileName) {
  const filePath = path.join(templatesDir, fileName);
  if (!fs.existsSync(filePath)) {
    console.error(`Template file not found: ${filePath}`);
    return null;
  }
  const rawData = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(rawData);
}

// Load all templates
const goodsTemplate = loadTemplate('goods.json');
const servicesTemplate = loadTemplate('service.json');
const worksTemplate = loadTemplate('works.json');

console.log('Goods template loaded:', goodsTemplate ? '✅' : '❌');
console.log('Services template loaded:', servicesTemplate ? '✅' : '❌');
console.log('Works template loaded:', worksTemplate ? '✅' : '❌');

// Now goodsTemplate.sections contains all questions to render dynamically


const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, "uploads/"); },
  filename: function (req, file, cb) { cb(null, Date.now() + "-" + file.originalname); },
});
const upload = multer({ storage });


// Dashboard
router.get('/dashboard', adminCtrl.dashboard);
// dashsup
router.get('/dashsup',adminCtrl.dashboards);
// dashcli
router.get('/dashcl',adminCtrl.dashboardc);


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
  try {
    const user = req.session.user;
    if(!user){
     return res.redirect('/')
    }   
     res.render('permissions'); // assuming your file is permissions.ejs 
  } catch (error) {
    
  }
 
});

router.get('/super',(req,res)=>{
    try {
      const user = req.session.user;
      if(!user){
       return res.redirect('/');
      }
       res.render('super')
      
    } catch (error) {
      
    }
})

router.get('/client',(req,res)=>{
    try {

      const user = req.session.user;
      if(!user){
       return res.redirect('/')
      }
        res.render('client')
      
    } catch (error) {
      
    }
})

// all suplier
router.get('/suplier',(req,res)=>{
  try {
    const user = req.session.user;
    if(!user){
     return res.redirect('/')
    }
    res.render('supplier')
  } catch (error) {
    
  }
});

// supplier created by supplier
router.get('/mysuplier',(req,res)=>{
  const user = req.session.user;
  if(!user){
    return res.redirect('/');
  }
    db.query("SELECT * FROM suppliers")
    .then(([results]) => {
      console.log("Fetched suppliers:", results);
      res.render("mysupplier", { suppliers: results });
      console.log("Sample supplier:", results[0]);
console.log("Type of verified:", typeof results[0].verified);

    })
    .catch((error) => {
      console.error("Error fetching suppliers:", error);
      res.status(500).send("Error fetching suppliers");
    });
  
})

router.get('/bids',(req,res)=>{
     try {
      const user = req.session.user;
      if(!user){
     return   res.redirect('/')
      }
     res.render('rfx')
     } catch (error) {
      
     }

})

// tender admn

router.get('/tender', async (req, res) => {
  try {
    const user = req.session.user;
    if(!user){
    return  res.redirect('/');
    }
     const [test] = await db.query("SELECT * FROM clients");
    const [tenders] = await db.query(`SELECT 
    t.*,        -- all columns from tenders
    j.client    -- client from jobs
FROM tenders t
LEFT JOIN jobs j ON j.id = t.job_id;
`);
    const [category] = await db.query("SELECT * FROM categories");
    // console.log("✅ Retrieved tenders:", tenders); // Debugging log
    // console.log(category);
    

    res.render('tender', { tenders,category,test });
  } catch (err) {
    console.error("❌ Error loading closed tenders:", err.message);
    res.status(500).send("Error loading tenders: " + err.message);
  }
});

// tenders suplier
router.get('/tenders', async (req, res) => {

  try {
    const user = req.session.user;
    if(!user){
      return res.redirect('/');
    }
    //const stat = 'draft'
    const [tenders] = await db.query(`
    SELECT 
    j.client,
    j.bid_title,
    j.closing_datetime,
    t.job_id,
    t.category,
    t.description,
    t.type
FROM jobs j
INNER JOIN tenders t
    ON t.job_id = j.id
    WHERE j.que ='1'
ORDER BY j.closing_datetime ASC;

    
    `);
    const [category] = await db.query("SELECT * FROM categories");
    // console.log("✅ Retrieved tenders:", tenders); // Debugging log
    // console.log(category);
    

    res.render('tenders', { tenders,category });
  } catch (err) {
    console.error("❌ Error loading closed tenders:", err.message);
    res.status(500).send("Error loading tenders: " + err.message);
  }
});

router.get('/preq', async(req,res)=>{
    try {
      const user = req.session.user;
      const client = req.session.client
      if(!user){
      return  res.redirect('/')
      }
    const [catego] = await db.query("SELECT * FROM categories");
    console.log("✅ Retrieved catego:",catego); // Debugging log
    const [test] = await db.query("SELECT * FROM clients");

    res.render('preq', { catego,test, client });
  } catch (err) {
    console.error("❌ Error loading closed tenders:", err.message);
    res.status(500).send("Error loading tenders: " + err.message);
  }
  // res.render('preq')
})

router.get('/log',(req,res)=>{
       try {
      const user = req.session.user;
      if(!user){
      return  res.redirect('/')
      }
     res.render('logs')
     } catch (error) {
      
     }
  
})

router.get('/reports',(req,res)=>{
     try {
      const user = req.session.user;
      if(!user){
       return res.redirect('/')
      }
     res.render('report')
     } catch (error) {
      
     }
})

router.get('/reportc',(req,res)=>{
       try {
      const user = req.session.user;
      if(!user){
      return res.redirect('/')
      }
     res.render('archivecl')
     } catch (error) {
      
     }
  
})

router.get('/sms', async(req,res)=>{
  try {
    const user = req.session.user;
    if(!user){
     return res.redirect('/')
    }
     const [message] = await db.query("SELECT * FROM notification");
     console.log("Successful loaded notification", message);
       res.render('sms',{message})
    
  } catch (error) {
    console.error("❌ Error loading notifications:");
    res.status(500).send("Error loading notifications: " );
  }
})
// suplier_profile
router.get('/sup_profile', (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.redirect('/'); // 🟢 Add return to stop further execution
    }
    res.render('suplier_profile'); // This runs only if user exists
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


// statutory document
router.get('/doc', async (req, res) => {
  try {
    const user = req.session.user;

    if (!user) {
      return res.redirect('/'); // Redirect if session expired or not logged in
    }

    // supliers
    const [supplier] = await db.query(
      "SELECT * FROM suppliers WHERE person = ?",
      [user.person]
    );

    // sup_regdetails
    const [regdetail] = await db.query("SELECT * FROM registration WHERE email = ?", [user.email]);

       console.log("Supplier Data:", supplier);
      console.log("regdetails :", regdetail);

      // statutory details
       const [stats] = await db.query("SELECT * FROM statutory WHERE reg_id = ?", [user.reg_id]);
      console.log("stats_data :", stats);

   

    res.render('document', { supplier: supplier[0],regdetail,stats });
  } catch (err) {
    console.error("Error loading document:", err);
    res.status(500).send("Server error");
  }
});

// rfq
router.get('/rfq',async(req,res)=>{
       try {
      const user = req.session.user;
      if(!user){
      return  res.redirect('/')
      }
       const [test] = await db.query("SELECT * FROM clients");
       const [rfqs] = await db.query(
       `
       SELECT 
    rfqs.*, 
    jobs.client, 
    jobs.bid_title
FROM rfqs
LEFT JOIN jobs 
    ON jobs.id = rfqs.job_id;
       
       `);
     res.render('rfq',{test,rfqs})
     } catch (error) {
      
     }

})
// rfqs
router.get('/rfqs',async(req,res)=>{
       try {
      const user = req.session.user;
      if(!user){
       return res.redirect('/')
      }
      
             const [jobs] = await db.query(`
              
SELECT 
    r.*,               -- all columns from rfqs
     j.bid_title,
    j.client
FROM rfqs r
INNER JOIN jobs j
    ON r.job_id = j.id
ORDER BY j.id ASC;
              
              `) ;
             console.log(jobs);
             
            res.render('rfqs',{jobs});
       
     } catch (error) {
      
     }
  
})
// rfp
router.get('/rfp',async(req,res)=>{
       try {
      const user = req.session.user;
      if(!user){
       return res.redirect('/')
      }
      
      const [test] = await db.query("SELECT * FROM clients");
      const [rfps] = await db.query(`SELECT 
    j.client,
    j.bid_title,
    r.*
FROM rfp_submissions r
JOIN jobs j ON r.job_id = j.id;
`)
     res.render('rfp',{test,rfps})
     } catch (error) {
      
     }
 
})
// rfps
router.get('/rfps',(req,res)=>{
       try {
      const user = req.session.user;
      if(!user){
      return  res.redirect('/')
      }
     res.render('rfps')
     } catch (error) {
      
     }

})
// eoi
router.get('/eoi',(req,res)=>{
       try {
      const user = req.session.user;
      if(!user){
      return  res.redirect('/')
      }
     res.render('eoi')
     } catch (error) {
      
     }
  
})

// eois
router.get('/eois',(req,res)=>{
       try {
      const user = req.session.user;
      if(!user){
       return res.redirect('/')
      }
     res.render('eois')
     } catch (error) {
      
     }
 
})
// rfi
router.get('/rfi',(req,res)=>{
     try {
      const user = req.session.user;
      if(!user){
       return res.redirect('/')
      }
     res.render('rfi')
     } catch (error) {
      
     }

});

// rfis
router.get('/rfis',(req,res)=>{
       try {
      const user = req.session.user;
      if(!user){
     return res.redirect('/')
      }
     res.render('rfis');
     } catch (error) {
      
     }
 
})

// reverse auction
router.get('/auction',(req,res)=>{
       try {
      const user = req.session.user;
      if(!user){
      return res.redirect('/')
      }
     res.render('rev_auction');
     } catch (error) {
      
     }

});


// suplier-prequal
router.get('/prequal', async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.redirect('/');
    }

    // 1️⃣ Fetch jobs with categories and uploads
    const [ques] = await db.query(`
      SELECT 
        j.id AS job_id,
        j.client,
        j.bid_title,
        j.closing_datetime,
        j.eligibility,
        j.status,
        j.que,
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
      WHERE j.que = '1'
      ORDER BY j.closing_datetime ASC
    `);

    // 2️⃣ Get paid transactions for this user (by phone or user id)
    const [paid] = await db.query(
      "SELECT job_id FROM transactions WHERE status = 'Success' ",
      
    );

    // 3️⃣ Build a Set for easy lookup in EJS
    const paidJobIds = new Set(paid.map(p => p.job_id));

    // 4️⃣ Render the page
    res.render('prequal', { ques, paidJobIds });

  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});



// qa
// Assuming you already have router and db configured
router.get('/qas', async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.redirect('/');

    // -----------------------------------------
    // CAPTURE job parameter e.g. ?job=12/25
    // -----------------------------------------
    if (req.query.job) {
      const parts = req.query.job.split("/");

      // Expected => parts[0] = category_no, parts[1] = job_id
      req.session.category_no = parts[0];
      req.session.job_id = parts[1];

      console.log("SESSION CATEGORY NO:", req.session.category_no);
      console.log("SESSION JOB ID:", req.session.job_id);
    }

    const jobId = req.session.job_id;
    const categoryNo = req.session.category_no;

    // -----------------------------------------
    // USE SESSION VALUES TO QUERY DB
    // -----------------------------------------

    // fetch uploads for this job
    const [uploads] = await db.query(
      "SELECT * FROM uploads WHERE job_id = ?",
      [jobId]
    );

    // fetch categories for this job
    const [catego] = await db.query(
      "SELECT * FROM categories WHERE job_id = ?",
      [jobId]
    );

    // Render page
    res.render('qa', {
      uploads,
      catego,
      jobId,
      categoryNo
    });

  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});


// client approval
router.get('/approve',async(req,res)=>{
    try {
      const user = req.session.user;
      if(!user){
        return res.redirect('/')
      };
const [draftTendersRows] = await db.query(`

  SELECT
      j.id AS job_id,
      j.client,
      j.bid_title,
      j.closing_datetime,
      COALESCE(t.description, rfp.description, rfq.description) AS description,
      rfq.item_description,
      j.eligibility,
      j.status
  FROM jobs j
  LEFT JOIN tenders t       ON t.job_id = j.id
  LEFT JOIN rfp_submissions rfp ON rfp.job_id = j.id
  LEFT JOIN rfqs rfq        ON rfq.job_id = j.id
  WHERE j.status IN ('draft','approved','rejected')
  ORDER BY j.closing_datetime ASC;
`);
   
            res.render('approval',{draftTendersRows});
    } catch (error) {
      
    }
});

// open bids
router.get('/openbids',async(req,res)=>{
    try {
      const user = req.session.user;
      if(!user){
        return res.redirect('/')
      }
            const status2 = 'approved';
           const [openbids] = await db.query(`
  SELECT 
    t.id,
    t.code,
    t.title,
    t.category,
    t.description,
    t.closing_date,
    t.status,
    cat.total
  FROM tenders AS t
  LEFT JOIN (
    SELECT category, COUNT(*) AS total
    FROM tenders
    WHERE status = ?
    GROUP BY category
  ) AS cat ON t.category = cat.category
  WHERE t.status = ?
  ORDER BY t.closing_date DESC
`, [status2, status2]);


      res.render('openbids',{openbids});
    } catch (error) {
      
    }
});

// closed bids
router.get('/closedbids',(req,res)=>{
    try {
      const user = req.session.user;
      if(!user){
        return res.redirect('/')
      }
      res.render('closedbids');
    } catch (error) {
      
    }
})

// qa-client
// closed bids
router.get('/qa_client',(req,res)=>{
    try {
      const user = req.session.user;
      if(!user){
        return res.redirect('/')
      }
      res.render('qa_client');
    } catch (error) {
      
    }
})


// archive_client
router.get('/archive_client',(req,res)=>{
  res.render('archive_client')
})

// POST route for submitting questionnaire (NO MULTER)
// POST route for submitting questionnaire (NO MULTER)
router.post("/submit_questionnaire", upload.any(), async (req, res) => {
  try {
    console.log("🔥 POST /submit_questionnaire hit");
    console.log("Received body:", req.body);
    console.log("Session:", req.session);

    const supplierId = req.session.user?.reg_id;
    if (!supplierId) return res.status(401).send("Unauthorized supplier.");

    const jobId = req.body.job_id;
    const category = req.body.category; // must match questionnaires.category exactly
    if (!jobId || !category) return res.status(400).send("Invalid submission.");
    
    const data = JSON.parse(req.body.questionnaireData || "[]");

    // ✅ Insert questionnaire if it doesn't already exist
    for (const q of data) {
      const [exists] = await db.query(
        `SELECT id FROM questionnaires 
         WHERE job_id = ? AND category = ? AND question_index = ?`,
        [q.job_id, q.category, q.question_index]
      );

      if (exists.length === 0) {
        await db.query(
          `INSERT INTO questionnaires
            (job_id, category, question_index, question_text, answer_type, mandatory, weight)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [q.job_id, q.category, q.question_index, q.question_text, q.answer_type, q.mandatory, q.weight]
        );
      }
    }

    // Fetch questions for this job/category
    const [questions] = await db.query(
      `SELECT * FROM questionnaires 
       WHERE job_id = ? AND category = ?
       ORDER BY question_index ASC`,
      [jobId, category]
    );

    // ✅ Save trade references (avoid duplicates)
    if (req.body.orgName && Array.isArray(req.body.orgName)) {
      const len = req.body.orgName.length;
      for (let i = 0; i < len; i++) {
        const [exists] = await db.query(
          `SELECT id FROM supplier_trade_references
           WHERE supplier_id = ? AND job_id = ? AND category = ? AND org_name = ?`,
          [supplierId, jobId, category, req.body.orgName[i]]
        );

        if (exists.length === 0) {
          await db.query(
            `INSERT INTO supplier_trade_references
             (supplier_id, job_id, category, org_name, contact_person, designation, telephone, email, goods, contract_value)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              supplierId,
              jobId,
              category,
              req.body.orgName[i],
              req.body.contactPerson[i],
              req.body.designation[i],
              req.body.telephone[i],
              req.body.email[i],
              req.body.goods[i],
              req.body.contractValue[i]
            ]
          );
        }
      }
    }

 // ✅ Save questionnaire answers (avoid duplicates, handle files)
for (let i = 0; i < questions.length; i++) {
  const q = questions[i];

  // 1️⃣ Check if a file was uploaded for this question
  const fileField = `attachment${i}`;
  let answer = req.body[`q${i}`] || ""; // default to empty string

  if (req.files && req.files.length > 0) {
    const fileObj = req.files.find(f => f.fieldname === fileField);
    if (fileObj) {
      answer = fileObj.filename; // save uploaded file name
    }
  }

  // 2️⃣ Avoid duplicate entries
  const [exists] = await db.query(
    `SELECT id FROM supplier_responses 
     WHERE supplier_id = ? AND questionnaire_id = ?`,
    [supplierId, q.id]
  );

  // 3️⃣ Insert only if not already exists
  if (exists.length === 0) {
    await db.query(
      `INSERT INTO supplier_responses (supplier_id, questionnaire_id, answer_text)
       VALUES (?, ?, ?)`,
      [supplierId, q.id, answer]
    );
  }
}


    console.log("✅ All answers saved (duplicates avoided)!");
    res.send(`
      <script>
        alert("✅ Questionnaire submitted successfully!");
        window.location.href = "/admin/dashsup";
      </script>
    `);

  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).send("Server error while saving questionnaire.");
  }
});




// Utility function to load a template
function loadTemplate(fileName) {
  const filePath = path.join(templatesDir, fileName);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const rawData = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(rawData);
}

// Serve supplier form based on category
router.get('/template/:category/form/:job_id', (req, res) => {
  const category = req.params.category.toLowerCase();

  let templateFile;
  switch (category) {
    case 'goods':
      templateFile = 'goods.json';
      break;
    case 'services':
      templateFile = 'service.json';
      break;
    case 'works':
      templateFile = 'works.json';
      break;
    default:
      return res.status(400).send('Invalid category');
  }

  const template = loadTemplate(templateFile);
  if (!template) {
    return res.status(404).send('Template not found');
  }

  // Render EJS page
  res.render('rfpqa', { template });
});
router.get('/template/:template/form/:job_id', (req, res) => {
  const templateType = req.params.template.toLowerCase(); // matches :template in URL
  const jobId = req.params.job_id;

  let templateFile;

  switch (templateType) {
    case 'goods':
      templateFile = 'goods.json';
      break;
    case 'services':
      templateFile = 'service.json';
      break;
    case 'works':
      templateFile = 'works.json';
      break;
    default:
      return res.status(400).send('Invalid template type');
  }

  const templates = loadTemplate(templateFile);
  if (!template) {
    return res.status(404).send('Template not found');
  }

  // Render EJS page with template + jobId
  res.render('rfpqa', {
    templates,
    jobId
  });
});

//que jobs
router.post('/proceed/:jobId', async (req, res) => {
  try {
    const jobId = req.params.jobId;

    if (!jobId) {
      return res.json({ success: false, message: "Missing job ID" });
    }

    // 1️⃣ Check if job is already queued
    const [rows] = await db.query(
      "SELECT que FROM jobs WHERE id = ? LIMIT 1",
      [jobId]
    );

    if (rows.length === 0) {
      return res.json({ success: false, message: "Job not found" });
    }

    if (rows[0].que === 1) {
      return res.json({ success: false, message: "Job already queued" });
    }

    // 2️⃣ Queue the job (update que = 1)
    await db.query(
      "UPDATE jobs SET que = 1 WHERE id = ?",
      [jobId]
    );

    return res.json({ success: true, message: "Job queued successfully" });

  } catch (error) {
    console.error("PROCEED ERROR:", error);
    return res.json({ success: false, message: "Server error" });
  }
});
//submeet quotation
router.post('/submit_jobs', async (req, res) => {
  try {
    const supplierId = req.session.user.reg_id;
    const jobId = req.body.job_id;
    const template = req.body.template;
    const items = req.body.items;

    if (!jobId || !template || !Array.isArray(items)) {
      return res.status(400).json({ success: false, message: "Missing data" });
    }

    // Insert each item
    for (const item of items) {
      const item_description = item.item_description || "";
      const desc = item.description || "";
      const bid = item.bid_title || "";
      const prc = parseFloat(item.unit_price) || 0;
      const qty = parseFloat(item.quantity) || 0;
      const total = parseFloat(item.total_price) || (prc * qty);
      const comment = item.comments || "";

      if (!prc || !qty) continue;

      // Optional: check duplicates
      const [exists] = await db.query(
        `SELECT id FROM quotation_submissions
         WHERE supplier_id = ? AND job_id = ? AND bid_title = ? AND description = ?`,
        [supplierId, jobId, bid, desc]
      );
      if (exists.length > 0) continue;

      await db.query(
        `INSERT INTO quotation_submissions
         (job_id, supplier_id, template, bid_title, description, item_description, price, quantity, total_price, comments)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [jobId, supplierId, template, bid, desc, item_description, prc, qty, total, comment]
      );
    }

    // Instead of res.redirect, send JSON
    res.json({
      success: true,
      redirect: `/admin/template/${template}/form/${jobId}`
    });

  } catch (err) {
    console.error("Error in /submit_jobs:", err);
    res.status(500).json({ success: false, message: "Error saving quotation" });
  }
});







module.exports = router;
