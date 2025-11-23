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
    const [tenders] = await db.query("SELECT * FROM tenders");
    const [category] = await db.query("SELECT * FROM categories");
    // console.log("✅ Retrieved tenders:", tenders); // Debugging log
    // console.log(category);
    

    res.render('tender', { tenders,category });
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
    const stat = 'draft'
    const [tenders] = await db.query("SELECT * FROM tenders WHERE status = ?",[stat]);
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
      if(!user){
      return  res.redirect('/')
      }
    const [catego] = await db.query("SELECT * FROM categories");
    console.log("✅ Retrieved catego:",catego); // Debugging log
    const [test] = await db.query("SELECT * FROM clients");

    res.render('preq', { catego,test });
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
    c.category_name,
    t.title,
    c.description,
    c.price
  FROM categories c
  INNER JOIN tenders t 
    ON c.category_name = t.category
  ORDER BY c.category_name ASC
              
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
      return res.redirect('/'); // ✅ return stops further execution
    }

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
    
    const[paid] = await db.query(`SELECT * FROM transactions WHERE status ='success'`);

    res.render('prequal', { ques, paid}); // ✅ simplified
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

    // Fetch uploaded questionnaires from DB
    const [uploads] = await db.query("SELECT * FROM uploads");

    // You can also fetch categories if needed
    const [catego] = await db.query("SELECT DISTINCT category_name FROM categories");

    res.render('qa', { uploads, catego });
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
//       const status = 'draft';
//       const status1 = 'rejected'
//       const status2 = 'approved';


//       // pending tenders
//    const [tenders] = await db.query("SELECT * FROM tenders WHERE status = ?",[status]);
// //approved tenders
//      const [tender] = await db.query("SELECT * FROM tenders WHERE status = ?",[status2]);

//      const [reject] = await db.query("SELECT * FROM tenders WHERE status = ?",[status1]);
 
//    console.log(tender);

// draft bids
const [draftTendersRows] = await db.query(`
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
  WHERE j.status IN ('draft', 'approved', 'rejected')
  ORDER BY j.closing_datetime ASC
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
router.post("/submit_questionnaire", async (req, res) => {
  try {
    console.log("🔥 POST /submit_questionnaire hit");
    console.log("Form Body:", req.body);

    const supplierId = req.session.supplierId;
    const jobId = req.body.job_id;
    const category = req.body.category;

    if (!supplierId) return res.status(401).send("Unauthorized supplier.");
    if (!jobId || !category) return res.status(400).send("Invalid submission.");

    // Fetch questions for this job/category
    const [questions] = await db.query(
      `SELECT * FROM questionnaires 
       WHERE job_id = ? AND category = ? 
       ORDER BY question_index ASC`,
      [jobId, category]
    );

    if (!questions.length)
      return res.status(400).send("No questions found for this questionnaire.");

    console.log("Loaded questions:", questions.length);

    // ⛳ Detect if trade references appear in this questionnaire
    const containsTradeRef = questions.some(q =>
      q.question_text.toLowerCase().includes("trade reference")
    );

    // ⭐ Save Trade Reference block ONCE (if exists)
    if (containsTradeRef) {
      await db.query(
        `INSERT INTO supplier_trade_references
         (supplier_id, org_name, contact_person, designation, telephone, email, goods, contract_value)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          supplierId,
          req.body.orgName || null,
          req.body.contactPerson || null,
          req.body.designation || null,
          req.body.telephone || null,
          req.body.email || null,
          req.body.goods || null,
          req.body.contractValue || null
        ]
      );

      console.log("Saved trade reference block");
    }

    // ⭐ Loop through each question and save answer
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const answer = req.body[`q${i}`];

      // Mandatory check
      if (q.mandatory === "Y" && (!answer || answer.trim() === "")) {
        return res.status(400).send(`Mandatory Question Missing: ${q.question_text}`);
      }

      await db.query(
        `INSERT INTO supplier_responses
         (supplier_id, questionnaire_id, answer_text)
         VALUES (?, ?, ?)`,
        [supplierId, q.id, answer || null]
      );
    }

    console.log(`✅ Supplier ${supplierId} submitted questionnaire for Job ${jobId}`);
    res.redirect("/admin/qas");

  } catch (err) {
    console.error("❌ Error submitting questionnaire:", err);
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
router.get('/template/:category/form', (req, res) => {
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




module.exports = router;
