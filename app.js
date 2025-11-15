const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const axios = require('axios')
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


// Express route for handling form submission
// app.post('/stk_push', (req, res) => {
//     console.log("REQ BODY => ", req.body);
// });
// Your Safaricom sandbox details
const shortCode = "174379"; // Replace with your sandbox shortcode
let token = "";

// ---------------------------
// Generate M-PESA Access Token
// ---------------------------

// ---------------------------
// Generate M-PESA Access Token
// ---------------------------
const generateToken = async (req, res, next) => {
    const consumerKey = "Jc6Ztr8PZLvNOmHAWvk8LMaSIAA6Xt7Ib3ogJeZJ7DH4M9JM";
    const consumerSecret = "uClioBnxVmpSp36bCawetG5DSFbBJkbujKdJ7sFKh7A0OaFdzeJ9e2MndTbiyAGD";

    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

    try {
        const response = await axios.get(
            "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
            { headers: { Authorization: `Basic ${auth}` } }
        );

        token = response.data.access_token;
        console.log("🟢 Token generated:", token);
        next();
    } catch (err) {
        console.error("❌ Token generation error:", err.message);
        res.status(400).json({ success: false, message: err.message });
    }
};

// ---------------------------
// STK Push Route
// ---------------------------
const stkPush = async (req, res) => {
    try {
        const { tel, amount, jobids } = req.body; // receive phone, amount, category codes

        if (!tel || !amount || !jobids) {
            return res.status(400).json({ success: false, message: "Phone and amount are required" });
        }

              // SAVE JOB ID + PHONE FOR CALLBACK
        req.session.lastJobID = jobids;
        req.session.lastPhone = tel;
        
        const passkey = "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";
        const url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";

        const date = new Date();
        const timestamp =
            date.getFullYear() +
            ("0" + (date.getMonth() + 1)).slice(-2) +
            ("0" + date.getDate()).slice(-2) +
            ("0" + date.getHours()).slice(-2) +
            ("0" + date.getMinutes()).slice(-2) +
            ("0" + date.getSeconds()).slice(-2);

        const stk_password = Buffer.from(shortCode + passkey + timestamp).toString("base64");
           let amountInt = parseInt(parseFloat(amount)); // 200.00 -> 200

        const data = {
            BusinessShortCode: shortCode,
            Password: stk_password,
            Timestamp: timestamp,
            TransactionType: "CustomerPayBillOnline",
            Amount: amountInt,
            PartyA: tel,
            PartyB: shortCode,
            PhoneNumber: tel,
            CallBackURL: "https://4c318528a1f5.ngrok-free.app/mpesa/callback", // replace with your callback
            AccountReference:"BuniSource",
            TransactionDesc: "Pay for Job to bid"
        };

        const response = await axios.post(url, data, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log("STK Push response:", response.data);

        res.status(200).json({
            success: true,
            message: "STK Push initiated successfully",
            data: response.data
        });
        // Save initial STK push info
await db.query(
    "INSERT INTO mpesa_init (checkout_request_id, job_id, phone) VALUES (?, ?, ?)",
    [response.data.CheckoutRequestID, jobids, tel]
);


    } catch (err) {
        console.error("STK Push error:", err.response?.data || err.message);
        res.status(400).json({
            success: false,
            message: err.response?.data?.errorMessage || err.message || "STK Push failed"
        });
    }
};

// ---------------------------
// Route
// ---------------------------
app.post("/stk_push", generateToken, stkPush);

//mpesa callback

app.post("/mpesa/callback", async (req, res) => {
    console.log("🔥 CALLBACK RECEIVED FROM SAFARICOM");
    console.log(JSON.stringify(req.body, null, 2));

    const cb = req.body?.Body?.stkCallback;

    const resultCode = cb?.ResultCode;
    const resultDesc = cb?.ResultDesc;
    const merchantRequestId = cb?.MerchantRequestID;
    const checkoutRequestId = cb?.CheckoutRequestID;

    const amount = cb?.CallbackMetadata?.Item?.find(i => i.Name === "Amount")?.Value || 0;
    const mpesaReceipt = cb?.CallbackMetadata?.Item?.find(i => i.Name === "MpesaReceiptNumber")?.Value || "";
    const phone = cb?.CallbackMetadata?.Item?.find(i => i.Name === "PhoneNumber")?.Value || "";
    
    // Retrieve job_id stored during STK push
    const job_id = req.session.lastJobID;     // ❤️ This comes from STK push
    const phoneStored = req.session.lastPhone; // ❤️ This also comes from STK push

    try {
        // 1️⃣ Check if a transaction already exists
        const [existing] = await db.query(
            "SELECT * FROM transactions WHERE job_id = ? AND phone = ?",
            [job_id, phoneStored]
        );

        if (existing.length > 0) {
            const record = existing[0];

            // 2️⃣ Prevent replacing a successful transaction
            if (record.status === "Success") {
                console.log("⚠️ Payment already successful. Ignoring callback update.");

                return res.json({
                    message: "Payment was already successful — duplicate payment ignored",
                    status: "duplicate_success"
                });
            }

            // 3️⃣ Update only if previous transaction failed
            await db.query(
                `UPDATE transactions
                 SET amount = ?, mpesa_receipt_number = ?, status = ?, 
                     checkout_request_id = ?, merchant_request_id = ?, 
                     response_description = ?, transaction_date = NOW()
                 WHERE job_id = ? AND phone = ?`,
                [
                    amount,
                    mpesaReceipt,
                    resultCode === 0 ? "Success" : "Failed",
                    checkoutRequestId,
                    merchantRequestId,
                    resultDesc,
                    job_id,
                    phoneStored
                ]
            );

            return res.json({
                message: "Failed transaction updated successfully",
                status: "updated_failed"
            });
        }

        // 4️⃣ No existing record — insert normally
        await db.query(
            `INSERT INTO transactions 
             (job_id, phone, amount, mpesa_receipt_number, transaction_date, status,
             checkout_request_id, merchant_request_id, response_description)
             VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?)`,
            [
                job_id,
                phoneStored,
                amount,
                mpesaReceipt,
                resultCode === 0 ? "Success" : "Failed",
                checkoutRequestId,
                merchantRequestId,
                resultDesc
            ]
        );

        res.json({ message: "New transaction created", status: "inserted" });

    } catch (err) {
        console.error("❌ DB Save Error:", err);
        res.status(500).json({ error: "Failed to save callback" });
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
