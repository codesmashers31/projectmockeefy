import axios from 'axios';

async function check() {
  try {
    // Let's first log in to get a valid token
    const loginRes = await axios.post("http://localhost:5000/api/auth/login", {
      email: "balaabirami1997@gmail.com",
      password: "1234567890"
    });

    const token = loginRes.data.accessToken;
    const userId = loginRes.data.user.userId;

    console.log("Logged in successfully! Token:", token.substring(0, 20) + "...");
    console.log("UserId from login:", userId);

    // Call getUserProfile
    const profileRes = await axios.get("http://localhost:5000/api/user/profile", {
      headers: {
        Authorization: `Bearer ${token}`,
        userid: userId
      }
    });

    console.log("Profile endpoint response:\n", JSON.stringify(profileRes.data, null, 2));

  } catch (err) {
    console.error("Endpoint test failed:", err.response?.data || err.message);
  }
}

check();
