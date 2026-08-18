const axios = require('axios');
const { connectDB } = require('./db');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ success: false, error: 'Method not allowed.' }) };
  }

  try {
    const { name, email, message } = JSON.parse(event.body);
    if (!name || !email || !message) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: 'All fields are required.' }) };
    }

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

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Message sent successfully!' })
    };
  } catch (error) {
    console.error('Brevo API Error:', error.response?.data || error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: 'Failed to send message. Try again later.' })
    };
  }
};
