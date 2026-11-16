// inspect session script
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: __dirname + '/.env' });
(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const Session = (await import('./models/Session.js')).default;
    const s = await Session.findOne({ sessionId: 'SES-1794481162380-GWRRG' }).lean();
    console.log('Session:', JSON.stringify(s, null, 2));
  } catch (e) {
    console.error('Error', e);
  } finally {
    await mongoose.disconnect();
  }
})();
