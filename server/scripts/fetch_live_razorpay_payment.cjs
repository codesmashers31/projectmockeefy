const Razorpay = require('razorpay');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkRazorpay() {
  const rzp = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });

  const paymentId = 'pay_TzDtaT67QJLJjg';
  console.log('Fetching payment', paymentId, 'from Razorpay with key:', process.env.RAZORPAY_KEY_ID);
  try {
    const payment = await rzp.payments.fetch(paymentId);
    console.log('--- RAZORPAY PAYMENT ENTITY ---');
    console.log(JSON.stringify(payment, null, 2));

    const order = await rzp.orders.fetch(payment.order_id);
    console.log('--- RAZORPAY ORDER ENTITY ---');
    console.log(JSON.stringify(order, null, 2));
  } catch (err) {
    console.error('Razorpay Error:', err);
  }
}

checkRazorpay();
