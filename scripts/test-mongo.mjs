import fs from "node:fs";
import mongoose from "mongoose";

const raw = fs.readFileSync(".env.local", "utf8");
const line = raw.split(/\r?\n/).find((item) => item.startsWith("MONGODB_URI="));
const uri = line?.split("=").slice(1).join("=").replace(/^"|"$/g, "");

try {
  let lastError;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await mongoose.connect(uri, { family: 4, tls: true, serverSelectionTimeoutMS: 10000 });
      lastError = undefined;
      break;
    } catch (error) {
      lastError = error;
      await mongoose.disconnect().catch(() => undefined);
      if (attempt < 4) await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  if (lastError) throw lastError;
  console.log("OK default", mongoose.connection.readyState);
  await mongoose.disconnect();
} catch (error) {
  console.error("FAIL default", error.name, error.message);
  process.exit(1);
}
