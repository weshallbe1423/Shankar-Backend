const mongoose = require("mongoose");
require("dotenv").config();

const uri=`mongodb+srv://weshallbe1423:${encodeURIComponent("gh07lv3MD5AyDHDX")}@cluster0.hsccjxb.mongodb.net/mtk_master?authSource=admin`

const connectDB = async () => {
  try {
    await mongoose.connect(uri);
    console.log("🟢 MongoDB Connected Successfully");
  } catch (err) {
    console.error("🔴 MongoDB connection failed:", err);
    console.error("🧐 Cause:", err?.cause);
  }
};

module.exports = connectDB;
