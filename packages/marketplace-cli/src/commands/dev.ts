import { Command } from "commander";
import colors from "picocolors";
import { spawn } from "child_process";
import { promises as fs } from "fs";
import { join } from "path";

const dev = new Command("dev")
  .description("Run model in development mode")
  .option("--port <port>", "Server port", "8080")
  .option("--watch", "Watch for file changes", true)
  .action(async (options) => {
    console.log(colors.cyan("🔧 Development Mode"));
    console.log();

    // Check if we're in a project directory
    try {
      await fs.access("package.json");
    } catch {
      console.log(colors.red("❌ No package.json found"));
      console.log("Run this command from your model directory, or create a new project:");
      console.log(colors.cyan("  mp init --template runpod-signal-http"));
      process.exit(1);
    }

    // Check if dependencies are installed
    try {
      await fs.access("node_modules");
    } catch {
      console.log(colors.yellow("⚠️  Dependencies not installed"));
      console.log("Installing dependencies...");
      
      const install = spawn("npm", ["install"], { stdio: "inherit" });
      await new Promise((resolve, reject) => {
        install.on("close", (code) => {
          if (code === 0) resolve(code);
          else reject(new Error(`npm install failed with code ${code}`));
        });
      });
    }

    // Read package.json to determine dev script
    const packageJson = JSON.parse(await fs.readFile("package.json", "utf-8"));
    const devScript = packageJson.scripts?.dev || packageJson.scripts?.start;

    if (!devScript) {
      console.log(colors.red("❌ No dev script found in package.json"));
      console.log("Add a dev script to your package.json:");
      console.log(colors.dim('  "scripts": { "dev": "tsx watch src/server.ts" }'));
      process.exit(1);
    }

    console.log(colors.dim(`Starting development server on port ${options.port}...`));
    console.log(colors.dim(`Running: ${devScript}`));
    console.log();

    // Set environment variables
    const env = {
      ...process.env,
      PORT: options.port,
      NODE_ENV: "development",
    };

    // Start the development server
    const [cmd, ...args] = devScript.split(" ");
    const child = spawn(cmd, args, {
      stdio: "inherit",
      env,
    });

    // Handle process termination
    process.on("SIGINT", () => {
      console.log(colors.yellow("\\n🛑 Stopping development server..."));
      child.kill("SIGINT");
      process.exit(0);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        console.log(colors.red(`❌ Development server exited with code ${code}`));
        process.exit(code || 1);
      }
    });

    child.on("error", (error) => {
      console.log(colors.red("❌ Failed to start development server:"), error.message);
      process.exit(1);
    });

    // Show helpful information
    setTimeout(() => {
      console.log();
      console.log(colors.green("🎉 Development server is running!"));
      console.log();
      console.log("Test endpoints:");
      console.log(colors.cyan(`  curl http://localhost:${options.port}/health`));
      console.log(colors.cyan(`  curl -X POST http://localhost:${options.port}/infer \\\\`));
      console.log(colors.cyan(`    -H "Content-Type: application/json" \\\\`));
      console.log(colors.cyan(`    -d '{"symbol":"EURUSD","timeframe":"5m"}'`));
      console.log();
      console.log("Validate your model:");
      console.log(colors.cyan("  mp validate"));
      console.log();
      console.log(colors.dim("Press Ctrl+C to stop"));
    }, 2000);
  });

export default dev;
