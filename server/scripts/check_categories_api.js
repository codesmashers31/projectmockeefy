import axios from "axios";

async function run() {
  const res = await axios.get("http://localhost:5000/api/categories");
  console.log("Categories API response type:", typeof res.data, Array.isArray(res.data) ? "array" : Object.keys(res.data));
  const list = Array.isArray(res.data) ? res.data : (res.data.data || res.data.categories || []);
  console.log("Categories count:", list.length);
  console.log("Sample category:", list[0]);
}

run().catch(console.error);
