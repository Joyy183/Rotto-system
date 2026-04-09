require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

// 🔐 generate easy + secure random password
function generatePassword() {
  const words = ['Mango', 'Tiger', 'Coffee', 'Pizza', 'Rocket', 'Ocean', 'Apple', 'Queen'];
  const symbols = ['@', '#', '!', '$'];

  const word = words[Math.floor(Math.random() * words.length)];
  const number = Math.floor(100 + Math.random() * 900); // 3 digits
  const symbol = symbols[Math.floor(Math.random() * symbols.length)];

  return word + symbol + number;
}

async function seedShops() {
  try {
    // connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB ✅");

    for (let i = 1; i <= 30; i++) {
      const email = `shop${i}@test.com`;
      const password = generatePassword();

      // check if already exists
      const exists = await User.findOne({ email });
      if (exists) {
        console.log(`Skip ${email} (already exists)`);
        continue;
      }

      // create new shop
      await User.create({
        email,
        password, // hashing بيحصل تلقائي
        role: "shop",
        shopName: `Shop ${i}`
      });

      console.log(`Created: ${email} | Password: ${password}`);
    }

    console.log("DONE 🚀");
    process.exit();

  } catch (err) {
    console.error("Error ❌:", err.message);
    process.exit(1);
  }
}

seedShops();