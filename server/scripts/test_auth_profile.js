import axios from "axios";
import jwt from "jsonwebtoken";

const token = jwt.sign(
  {
    email: "darwininfantmichael@gmail.com",
    userType: "candidate",
    name: "Joel A",
    userId: "6ad1fd8b146a0a4e7ca163aa"
  },
  "code@1234",
  { expiresIn: "7d" }
);

async function test() {
  try {
    const res = await axios.get("http://localhost:5000/api/auth/profile", {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Auth profile success:", res.data.user.email, res.data.user.name);
  } catch (err) {
    console.error("Auth profile failed:", err.response?.status, err.response?.data);
  }
}

test();
