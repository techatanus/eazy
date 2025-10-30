const express = require('express');
const router = express.Router();
const adminCtrl = require('../controllers/adminController');
const db = require('../config/db');

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
      res.redirect('/');
    }
    const [tenders] = await db.query("SELECT * FROM tenders");
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

    res.render('preq', { catego });
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
router.get('/rfq',(req,res)=>{
       try {
      const user = req.session.user;
      if(!user){
      return  res.redirect('/')
      }
     res.render('rfq')
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
router.get('/rfp',(req,res)=>{
       try {
      const user = req.session.user;
      if(!user){
       return res.redirect('/')
      }
     res.render('rfp')
     } catch (error) {
      
     }
 
})
// rfps
router.get('/rfps',(req,res)=>{
       try {
      const user = req.session.user;
      if(!user){
        res.redirect('/')
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
        res.redirect('/')
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
router.get('/prequal', (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.redirect('/'); // ✅ return stops further execution
    }

    res.render('prequal'); // runs only if user exists
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// qa
router.get('/qas',(req,res)=>{
    try {
      const user = req.session.user;
      if(!user){
        return res.redirect('/')
      }
      res.render('qa');
    } catch (error) {
      
    }
})

// client approval
router.get('/approve',async(req,res)=>{
    try {
      const user = req.session.user;
      if(!user){
        return res.redirect('/')
      };
      const status = 'draft';
      const status1 = 'rejected'
    
      const status2 = 'approved';


      // pending tenders
   const [tenders] = await db.query("SELECT * FROM tenders WHERE status = ?",[status]);
//approved tenders
     const [tender] = await db.query("SELECT * FROM tenders WHERE status = ?",[status2]);

     const [reject] = await db.query("SELECT * FROM tenders WHERE status = ?",[status1]);
 
   console.log(tender);
   
            res.render('approval',{tenders,tender,reject});
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

// submeet quatation

// POST /submit_jobs
// router.post("/submit_jobs", async (req, res) => {
//   try {
//     const {
//       category,
//       item,
//       description,
//       price,
//       quantity,
//       total_price,
//       comments,
//       total_amount,
//     } = req.body;

//     // Ensure we have data
//     if (!category || category.length === 0) {
//       return res.status(400).send("No quotation data submitted.");
//     }

//     // Prepare an array of records
//     const quotes = [];
//     for (let i = 0; i < category.length; i++) {
//       quotes.push([
//         category[i],
//         item[i],
//         description[i],
//         parseFloat(price[i]) || 0,
//         parseFloat(quantity[i]) || 0,
//         parseFloat(total_price[i]) || 0,
//         comments[i] || "",
//         parseFloat(total_amount) || 0,
//       ]);
//     }

//     // Insert into MySQL (bulk insert)
//     const sql = `
//       INSERT INTO supplier_quotes 
//       (category, item, description, price, quantity, total_price, comments, total_amount) 
//       VALUES ?
//     `;

//     await db.query(sql, [quotes]);

//     console.log("Quotation saved successfully.");
//     res.redirect("/thankyou"); // or send JSON if using AJAX
//   } catch (error) {
//     console.error("Error saving quotation:", error);
//     res.status(500).send("Server error while saving quotation.");
//   }
// });





module.exports = router;