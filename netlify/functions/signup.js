const axios = require('axios');
const { connectDB } = require('./db');

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ success: false, error: 'Method not allowed.' }) };
  }

  try {
    const { name, email, password } = JSON.parse(event.body);
    if (!name || !email || !password) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: 'All fields are required.' }) };
    }
    if (password.length < 6) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Password must be at least 6 characters.' }) };
    }

    const db = await connectDB();
    const usersCollection = db.collection('users');
    const otpsCollection = db.collection('otps');

    await usersCollection.createIndex({ email: 1 }, { unique: true });
    await otpsCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

    const existingUser = await usersCollection.findOne({ email: email });
    if (existingUser && existingUser.verified) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Email already registered. Please login.' }) };
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

    await sendOTPEmail(email, name, otp);
    console.log(`OTP sent to ${email}: ${otp}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'OTP sent to your email. Check your inbox!' })
    };
  } catch (error) {
    console.error('OTP Email Error:', error.response?.data || error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: 'Failed to send OTP. Try again.' })
    };
  }
};
