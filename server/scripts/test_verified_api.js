import mongoose from "mongoose";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

async function run() {
  try {
    const res = await axios.get("http://localhost:5000/api/expert/verified");
    console.log("Verified API success:", res.data.success, "count:", res.data.count);
    const data = res.data.data;
    const prices = data.map(d => d.price);
    const under1k = prices.filter(p => p < 1000).length;
    const between1k2k = prices.filter(p => p >= 1000 && p <= 2000).length;
    const above2k = prices.filter(p => p > 2000).length;
    console.log("Price distribution:", { under1k, between1k2k, above2k });
    console.log("Sample prices:", prices.slice(0, 10));
  } catch (e) {
    console.error("API error:", e.message);
  }
}

run();
