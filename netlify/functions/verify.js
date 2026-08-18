const { connectDB } = require('./db');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ success: false, error: 'Method not allowed.' }) };
  }

  try {
    const { email, otp } = JSON.parse(event.body);
    if (!email || !otp) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Email and OTP are required.' }) };
    }

    const db = await connectDB();
    const usersCollection = db.collection('users');
    const otpsCollection = db.collection('otps');

    const record = await otpsCollection.findOne({ email: email });
    if (!record) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: 'No OTP found. Please signup again.' }) };
    }
    if (Date.now() > new Date(record.expiresAt).getTime()) {
      await otpsCollection.deleteOne({ email: email });
      return { statusCode: 400, body: JSON.stringify({ success: false, error: 'OTP expired. Please signup again.' }) };
    }
    if (record.otp !== otp) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Invalid OTP. Check your code.' }) };
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
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Account verified successfully! You can now login.' })
    };
  } catch (error) {
    console.error('Verify Error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: 'Verification failed. Try again.' })
    };
  }
};
