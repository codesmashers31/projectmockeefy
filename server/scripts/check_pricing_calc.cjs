const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkCalculatedPrice() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const expertId = '6ae2e7cf2ad1edd333f2aded';
  
  // Call internal logic of pricingController
  const pricingController = await import('../controllers/pricingController.js');
  
  const req = {
    query: {
      expertId,
      duration: '30',
      level: 'Rising Mentor'
    }
  };
  
  let resData = null;
  const res = {
    status: (code) => ({
      json: (data) => {
        resData = { code, data };
        return resData;
      }
    }),
    json: (data) => {
      resData = { code: 200, data };
      return resData;
    }
  };

  await pricingController.getCalculatePrice(req, res);
  console.log('Result for expert pricing calculation:');
  console.log(JSON.stringify(resData, null, 2));

  process.exit(0);
}

checkCalculatedPrice();
