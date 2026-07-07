import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log("Configured Cloudinary:");
console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("API Key:", process.env.CLOUDINARY_API_KEY);

console.log("Testing upload...");
try {
  // Upload a 1-pixel transparent GIF in-memory
  const result = await cloudinary.uploader.upload("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", {
    folder: "test_upload",
  });
  console.log("Upload SUCCESSFUL!");
  console.log("Secure URL:", result.secure_url);
  process.exit(0);
} catch (error) {
  console.error("Upload FAILED!");
  console.error(error);
  process.exit(1);
}
