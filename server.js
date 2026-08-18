require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ===== MongoDB Connection =====
const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
});

let usersCollection;
let otpsCollection;

async function connectDB() {
  try {
    await client.connect();
    const db = client.db('portfolio_auth');
    usersCollection = db.collection('users');
    otpsCollection = db.collection('otps');
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    await otpsCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    console.log('MongoDB connected successfully!');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
}

// ===== Helpers =====
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ===== Send OTP Email via Brevo =====
async function sendOTPEmail(email, name, otp) {
  await axios.post(
    'https://api.brevo.com/v3/smtp/email',
    {
      sender: { name: 'Salman Portfolio', email: process.env.YOUR_EMAIL },
      to: [{ email: email, name: name }],
      subject: 'Your Verification Code - Salman Portfolio',
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="margin:0; padding:0; background-color:#1a1a2e; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1a1a2e; padding:40px 20px;">
            <tr>
              <td align="center">
                <table width="500" cellpadding="0" cellspacing="0" style="background-color:#16213e; border-radius:16px; overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,0.3);">
                  <tr>
                    <td style="background:linear-gradient(135deg,#bb86fc,#6200ee); padding:30px 40px; text-align:center;">
                      <h1 style="margin:0; color:#fff; font-size:22px;">&#128274; Email Verification</h1>
                      <p style="margin:8px 0 0; color:rgba(255,255,255,0.8); font-size:14px;">Salman Portfolio</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:35px 40px; text-align:center;">
                      <p style="color:#e0e0e0; font-size:16px; margin:0 0 10px;">Hello <strong style="color:#bb86fc;">${name}</strong>,</p>
                      <p style="color:#e0e0e0; font-size:15px; margin:0 0 30px;">Use the following code to verify your account:</p>
                      <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                        <tr>
                          <td style="background:linear-gradient(135deg,#0f3460,#1a1a2e); border:2px solid #bb86fc; border-radius:14px; padding:20px 40px;">
                            <span style="font-size:36px; font-weight:800; letter-spacing:12px; color:#bb86fc; font-family:monospace;">${otp}</span>
                          </td>
                        </tr>
                      </table>
                      <p style="color:rgba(255,255,255,0.4); font-size:13px; margin:25px 0 0;">This code expires in <strong style="color:#cf6679;">5 minutes</strong></p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color:#0a0a23; padding:20px 40px; text-align:center;">
                      <p style="margin:0; color:rgba(255,255,255,0.4); font-size:12px;">If you didn't request this, ignore this email.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    },
    {
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    }
  );
}

// ===== CONTACT FORM =====
app.post('/api/messages', async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ success: false, error: 'All fields are required.' });
  }
  try {
    await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: { name: name, email: email },
        to: [{ email: process.env.YOUR_EMAIL, name: 'Website Owner' }],
        subject: `New Contact Form Message from ${name}`,
        htmlContent: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="UTF-8"></head>
          <body style="margin:0; padding:0; background-color:#1a1a2e; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1a1a2e; padding:40px 20px;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color:#16213e; border-radius:16px; overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,0.3);">
                    <tr>
                      <td style="background:linear-gradient(135deg,#bb86fc,#6200ee); padding:30px 40px; text-align:center;">
                        <h1 style="margin:0; color:#fff; font-size:24px;">&#9993; New Message Received</h1>
                        <p style="margin:8px 0 0; color:rgba(255,255,255,0.8); font-size:14px;">From your Portfolio Contact Form</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:35px 40px;">
                        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                          <tr>
                            <td style="background-color:#0f3460; border-radius:12px; padding:20px; border-left:4px solid #bb86fc;">
                              <p style="margin:0 0 6px; color:#bb86fc; font-size:12px; text-transform:uppercase; letter-spacing:2px; font-weight:600;">&#128100; Sender Name</p>
                              <p style="margin:0; color:#e0e0e0; font-size:18px; font-weight:600;">${name}</p>
                            </td>
                          </tr>
                        </table>
                        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                          <tr>
                            <td style="background-color:#0f3460; border-radius:12px; padding:20px; border-left:4px solid #03dac6;">
                              <p style="margin:0 0 6px; color:#03dac6; font-size:12px; text-transform:uppercase; letter-spacing:2px; font-weight:600;">&#128231; Sender Email</p>
                              <p style="margin:0; color:#e0e0e0; font-size:18px; font-weight:600;">${email}</p>
                            </td>
                          </tr>
                        </table>
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="background-color:#0f3460; border-radius:12px; padding:20px; border-left:4px solid #cf6679;">
                              <p style="margin:0 0 6px; color:#cf6679; font-size:12px; text-transform:uppercase; letter-spacing:2px; font-weight:600;">&#128172; Message</p>
                              <p style="margin:0; color:#e0e0e0; font-size:16px; line-height:1.7;">${message}</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="background-color:#0a0a23; padding:20px 40px; text-align:center;">
                        <p style="margin:0; color:rgba(255,255,255,0.4); font-size:12px;">Sent via Portfolio Contact Form &bull; ${new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
        replyTo: { email: email, name: name }
      },
      {
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    console.log('Contact email sent:', email);
    res.json({ success: true, message: 'Message sent successfully!' });
  } catch (error) {
    console.error('Brevo API Error:', error.response?.data || error.message);
    res.status(500).json({ success: false, error: 'Failed to send message. Try again later.' });
  }
});

// ===== SIGNUP - Send OTP =====
app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, error: 'All fields are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });
  }

  const existingUser = await usersCollection.findOne({ email: email });
  if (existingUser && existingUser.verified) {
    return res.status(400).json({ success: false, error: 'Email already registered. Please login.' });
  }

  const otp = generateOTP();

  await otpsCollection.deleteOne({ email: email });
  await otpsCollection.insertOne({
    email: email,
    name: name,
    password: password,
    otp: otp,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000)
  });

  try {
    await sendOTPEmail(email, name, otp);
    console.log(`OTP sent to ${email}: ${otp}`);
    res.json({ success: true, message: 'OTP sent to your email. Check your inbox!' });
  } catch (error) {
    console.error('OTP Email Error:', error.response?.data || error.message);
    res.status(500).json({ success: false, error: 'Failed to send OTP. Try again.' });
  }
});

// ===== VERIFY OTP =====
app.post('/api/auth/verify', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ success: false, error: 'Email and OTP are required.' });
  }

  const record = await otpsCollection.findOne({ email: email });
  if (!record) {
    return res.status(400).json({ success: false, error: 'No OTP found. Please signup again.' });
  }
  if (Date.now() > new Date(record.expiresAt).getTime()) {
    await otpsCollection.deleteOne({ email: email });
    return res.status(400).json({ success: false, error: 'OTP expired. Please signup again.' });
  }
  if (record.otp !== otp) {
    return res.status(400).json({ success: false, error: 'Invalid OTP. Check your code.' });
  }

  await usersCollection.insertOne({
    email: email,
    name: record.name,
    password: record.password,
    verified: true,
    createdAt: new Date()
  });

  await otpsCollection.deleteOne({ email: email });

  console.log(`User verified: ${email}`);
  res.json({ success: true, message: 'Account verified successfully! You can now login.' });
});

// ===== LOGIN =====
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required.' });
  }

  const user = await usersCollection.findOne({ email: email });
  if (!user) {
    return res.status(400).json({ success: false, error: 'No account found. Please signup first.' });
  }
  if (!user.verified) {
    return res.status(400).json({ success: false, error: 'Account not verified. Please signup and verify OTP.' });
  }
  if (user.password !== password) {
    return res.status(400).json({ success: false, error: 'Invalid password.' });
  }

  console.log(`User logged in: ${email}`);
  res.json({ success: true, message: 'Login successful!', user: { name: user.name, email: email } });
});

// ===== Catch All =====
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ===== Start Server =====
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
});
