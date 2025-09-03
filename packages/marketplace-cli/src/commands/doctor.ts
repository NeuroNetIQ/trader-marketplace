import { Command } from "commander";
import colors from "picocolors";
import fetch from "node-fetch";
import { loadConfig } from "../lib/config.js";
import { apiRequest } from "../lib/api.js";

const doctor = new Command("doctor")
  .description("Check CLI health and configuration")
  .action(async () => {
    console.log(colors.cyan("🩺 Marketplace CLI Doctor"));
    console.log();

    let hasErrors = false;
    const checks = [];

    // 1. Check CLI configuration
    console.log(colors.dim("Checking CLI configuration..."));
    try {
      const config = await loadConfig();
      
      if (config.apiKey) {
        checks.push({ name: "API Key", status: "✅", detail: "Configured" });
      } else {
        checks.push({ name: "API Key", status: "❌", detail: "Not configured - run 'mp login'" });
        hasErrors = true;
      }
      
      if (config.apiUrl) {
        checks.push({ name: "API URL", status: "✅", detail: config.apiUrl });
      } else {
        checks.push({ name: "API URL", status: "❌", detail: "Not configured" });
        hasErrors = true;
      }
      
      if (config.vendorId) {
        checks.push({ name: "Vendor ID", status: "✅", detail: config.vendorId });
      } else {
        checks.push({ name: "Vendor ID", status: "⚠️", detail: "Not set - may need re-authentication" });
      }
      
    } catch (error) {
      checks.push({ name: "CLI Config", status: "❌", detail: "Failed to load config" });
      hasErrors = true;
    }

    // 2. Check Infrastructure connectivity
    console.log(colors.dim("Checking Infrastructure connectivity..."));
    try {
      const config = await loadConfig();
      if (config.apiUrl) {
        const response = await fetch(`${config.apiUrl}/api/health`);
        if (response.ok) {
          const data = await response.json() as any;
          checks.push({ 
            name: "Infrastructure", 
            status: "✅", 
            detail: `${response.status} - ${data?.service || 'Unknown service'}` 
          });
        } else {
          checks.push({ 
            name: "Infrastructure", 
            status: "❌", 
            detail: `HTTP ${response.status}` 
          });
          hasErrors = true;
        }
      } else {
        checks.push({ name: "Infrastructure", status: "⏭️", detail: "Skipped - no API URL" });
      }
    } catch (error) {
      checks.push({ 
        name: "Infrastructure", 
        status: "❌", 
        detail: `Connection failed: ${error instanceof Error ? error.message : String(error)}` 
      });
      hasErrors = true;
    }

    // 3. Check authentication
    console.log(colors.dim("Checking authentication..."));
    try {
      const result = await apiRequest("/api/marketplace/vendor/me");
      if (result.success) {
        checks.push({ 
          name: "Authentication", 
          status: "✅", 
          detail: `Vendor: ${result.data?.name || 'Unknown'}` 
        });
      } else {
        checks.push({ 
          name: "Authentication", 
          status: "❌", 
          detail: result.error || "Failed" 
        });
        hasErrors = true;
      }
    } catch (error) {
      checks.push({ 
        name: "Authentication", 
        status: "❌", 
        detail: "Failed to verify credentials" 
      });
      hasErrors = true;
    }

    // 4. Check marketplace endpoints
    console.log(colors.dim("Checking marketplace endpoints..."));
    try {
      const catalogResult = await apiRequest("/api/catalog");
      if (catalogResult.success) {
        checks.push({ 
          name: "Marketplace Catalog", 
          status: "✅", 
          detail: `${catalogResult.data?.length || 0} models available` 
        });
      } else {
        checks.push({ 
          name: "Marketplace Catalog", 
          status: "❌", 
          detail: catalogResult.error || "Failed" 
        });
        hasErrors = true;
      }
    } catch (error) {
      checks.push({ 
        name: "Marketplace Catalog", 
        status: "❌", 
        detail: "Endpoint unreachable" 
      });
      hasErrors = true;
    }

    // 5. Check environment variables (for templates)
    console.log(colors.dim("Checking environment variables..."));
    const envChecks = [
      { name: "RUNPOD_API_KEY", env: "RUNPOD_API_KEY" },
      { name: "HF_TOKEN", env: "HF_TOKEN" },
      { name: "WANDB_API_KEY", env: "WANDB_API_KEY" },
    ];

    envChecks.forEach(({ name, env }) => {
      if (process.env[env]) {
        checks.push({ 
          name, 
          status: "✅", 
          detail: `${process.env[env]?.substring(0, 8)}...` 
        });
      } else {
        checks.push({ 
          name, 
          status: "⚠️", 
          detail: "Not set (optional for most operations)" 
        });
      }
    });

    // Display results
    console.log();
    console.log(colors.cyan("🩺 Health Check Results:"));
    console.log();

    checks.forEach(check => {
      const statusColor = check.status === "✅" ? colors.green : 
                         check.status === "❌" ? colors.red : colors.yellow;
      console.log(`${statusColor(check.status)} ${check.name}: ${colors.dim(check.detail)}`);
    });

    console.log();

    if (hasErrors) {
      console.log(colors.red("❌ Issues found"));
      console.log();
      console.log("Common fixes:");
      console.log(colors.dim("  • Authentication: mp login --sso"));
      console.log(colors.dim("  • API connectivity: Check network and API URL"));
      console.log(colors.dim("  • Missing keys: Set environment variables or use vendor console"));
      process.exit(1);
    } else {
      console.log(colors.green("✅ All checks passed!"));
      console.log();
      console.log("You're ready to:");
      console.log(colors.cyan("  mp data pull --round current"));
      console.log(colors.cyan("  mp train start --task signal"));
      console.log(colors.cyan("  mp init --template runpod-signal-http"));
      console.log(colors.cyan("  mp deploy --provider runpod"));
    }
  });

export default doctor;
