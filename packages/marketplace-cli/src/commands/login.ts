import { Command } from "commander";
import prompts from "prompts";
import colors from "picocolors";
import { spawn } from "child_process";
import { updateConfig } from "../lib/config.js";
import { apiRequest } from "../lib/api.js";

const login = new Command("login")
  .description("Authenticate with the Marketplace")
  .option("--api-url <url>", "Marketplace API URL", "https://infra.neuronetiq.com")
  .option("--api-key <key>", "API key (if you already have one)")
  .option("--sso", "Use SSO login (opens browser)")
  .action(async (options) => {
    console.log(colors.cyan("🔐 Marketplace Login"));
    console.log();

    let apiKey = options.apiKey;
    let vendorId: string;

    // SSO Flow
    if (options.sso) {
      console.log(colors.cyan("🌐 Opening browser for SSO login..."));
      
      try {
        // Open browser to marketplace login
        const loginUrl = `${options.apiUrl.replace('/api', '')}/marketplace/login?cli=true`;
        
        if (process.platform === 'darwin') {
          spawn('open', [loginUrl]);
        } else if (process.platform === 'win32') {
          spawn('start', [loginUrl], { shell: true });
        } else {
          spawn('xdg-open', [loginUrl]);
        }
        
        console.log(colors.dim(`If browser doesn't open, visit: ${loginUrl}`));
        console.log();
        
        // Wait for auth code
        const response = await prompts({
          type: "text",
          name: "authCode",
          message: "Enter the authentication code from your browser:",
          validate: (value) => value.length > 0 || "Auth code is required",
        });

        if (!response.authCode) {
          console.log(colors.red("❌ SSO login cancelled"));
          process.exit(1);
        }

        // Exchange auth code for API key
        const exchangeResult = await apiRequest("/api/marketplace/vendor/auth/exchange", {
          method: "POST",
          body: { auth_code: response.authCode },
        });

        if (!exchangeResult.success) {
          console.log(colors.red("❌ SSO exchange failed:"), exchangeResult.error);
          process.exit(1);
        }

        apiKey = exchangeResult.data.api_key;
        vendorId = exchangeResult.data.vendor_id;
        
      } catch (error) {
        console.log(colors.red("❌ SSO login failed:"), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    }
    // API Key Flow
    else if (!apiKey) {
      const response = await prompts([
        {
          type: "select",
          name: "method",
          message: "Choose authentication method:",
          choices: [
            { title: "SSO (Browser)", value: "sso" },
            { title: "API Key", value: "apikey" },
          ],
        },
      ]);

      if (response.method === "sso") {
        console.log(colors.yellow("💡 Use: mp login --sso"));
        process.exit(0);
      }

      const keyResponse = await prompts({
        type: "text",
        name: "apiKey",
        message: "Enter your Marketplace API key:",
        validate: (value) => value.length > 0 || "API key is required",
      });

      if (!keyResponse.apiKey) {
        console.log(colors.red("❌ Login cancelled"));
        process.exit(1);
      }

      apiKey = keyResponse.apiKey;
    }

    // Save config first so we can make API calls
    await updateConfig({
      apiUrl: options.apiUrl,
      apiKey,
    });

    try {
      // Verify API key by getting vendor info
      const result = await apiRequest("/api/vendors/me");
      
      if (!result.success) {
        console.log(colors.red("❌ Authentication failed:"), result.error);
        process.exit(1);
      }

      vendorId = result.data.id;

      // Update config with vendor ID
      await updateConfig({
        apiUrl: options.apiUrl,
        apiKey,
        vendorId,
      });

      console.log(colors.green("✅ Successfully authenticated"));
      console.log(colors.dim(`   Vendor ID: ${vendorId}`));
      console.log(colors.dim(`   API URL: ${options.apiUrl}`));
      console.log();
      console.log("Next steps:");
      console.log(colors.cyan("  mp init --template runpod-signal-http"));
      console.log(colors.cyan("  mp validate"));
      console.log(colors.cyan("  mp dev"));
      
    } catch (error) {
      console.log(colors.red("❌ Login failed:"), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

export default login;
