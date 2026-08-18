const { connectDB } = require('./db');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ success: false, error: 'Method not allowed.' }) };
  }

  try {
    const { email, password } = JSON.parse(event.body);
    if (!email || !password) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Email and password are required.' }) };
    }

    const db = await connectDB();
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({ email: email });
    if (!user) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: 'No account found. Please signup first.' }) };
    }
    if (!user.verified) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Account not verified. Please signup and verify OTP.' }) };
    }
    if (user.password !== password) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Invalid password.' }) };
    }

    console.log(`User logged in: ${email}`);
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Login successful!', user: { name: user.name, email: email } })
    };
  } catch (error) {
    console.error('Login Error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: 'Login failed. Try again.' })
    };
  }
};
