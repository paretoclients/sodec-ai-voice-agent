import { execSync } from "node:child_process";

function run(command) {
  execSync(command, { stdio: "inherit" });
}

if (process.env.RAILWAY_SERVICE_NAME === "api" || process.env.RAILWAY_SERVICE_ID) {
  run("npx prisma generate");
  run("npm run build -w @sodec/shared");
  run("npm run build -w @sodec/api");
} else {
  run("npm run build:all");
}

