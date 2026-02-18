import { execSync } from "child_process";

console.log("Regenerating package-lock.json...");
try {
  execSync("npm install --package-lock-only", {
    cwd: "/vercel/share/v0-project",
    stdio: "inherit",
  });
  console.log("package-lock.json regenerated successfully.");
} catch (error) {
  console.error("Failed to regenerate lockfile:", error.message);
  // Fallback: try full npm install
  console.log("Trying full npm install...");
  execSync("npm install", {
    cwd: "/vercel/share/v0-project",
    stdio: "inherit",
  });
  console.log("npm install completed.");
}
