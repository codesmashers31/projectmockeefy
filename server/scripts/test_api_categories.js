import axios from "axios";

async function run() {
  const allRes = await axios.get("http://localhost:5000/api/expert/verified");
  console.log("All count:", allRes.data.count);
  const sample = allRes.data.data[0];
  console.log("Sample availability fields:", {
    activeTime: sample.activeTime,
    isAvailableToday: sample.isAvailableToday,
    isAvailableThisWeek: sample.isAvailableThisWeek
  });

  const itRes = await axios.get("http://localhost:5000/api/expert/verified?category=IT");
  console.log("IT count:", itRes.data.count);

  const webRes = await axios.get("http://localhost:5000/api/expert/verified?category=Web%20Development");
  console.log("Web Development count:", webRes.data.count);

  const testRes = await axios.get("http://localhost:5000/api/expert/verified?category=Test");
  console.log("Test count (empty category):", testRes.data.count);
}

run().catch(console.error);
