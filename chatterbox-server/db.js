const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // Debugging: Log available environment variables (keys only for security)
    console.log("Environment Variables Keys:", Object.keys(process.env));
    console.log("MONGO_URI defined:", !!process.env.MONGO_URI);

    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing from environment variables");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection failed");
    console.error(err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
