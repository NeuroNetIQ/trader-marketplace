#!/usr/bin/env node

import { Command } from "commander";
import colors from "picocolors";

// Import commands
import login from "./commands/login.js";
import init from "./commands/init.js";
import validate from "./commands/validate.js";
import dev from "./commands/dev.js";
import deploy from "./commands/deploy.js";
import register from "./commands/register.js";
import heartbeat from "./commands/heartbeat.js";
import linkInfra from "./commands/link-infra.js";
import train from "./commands/train.js";
import data from "./commands/data.js";
import doctor from "./commands/doctor.js";
import config from "./commands/config.js";

const program = new Command();

program
  .name("mp")
  .description("NeuroNetIQ ML Marketplace CLI")
  .version("0.2.2")
  .configureHelp({
    sortSubcommands: true,
    subcommandTerm: (cmd) => cmd.name(),
  });

// Add all commands
program.addCommand(login);
program.addCommand(config);
program.addCommand(doctor);
program.addCommand(data);
program.addCommand(train);
program.addCommand(init);
program.addCommand(validate);
program.addCommand(dev);
program.addCommand(deploy);
program.addCommand(register);
program.addCommand(heartbeat);
program.addCommand(linkInfra);

// Add global error handler
program.exitOverride();

try {
  program.parse();
} catch (err: any) {
  if (err.code === "commander.helpDisplayed" || err.code === "commander.version") {
    // These are not actual errors
    process.exit(0);
  } else {
    console.error(colors.red("❌ CLI Error:"), err.message);
    process.exit(1);
  }
}

// Show help if no command provided
if (!process.argv.slice(2).length) {
  console.log(colors.cyan("🏪 NeuroNetIQ ML Marketplace CLI"));
  console.log();
  program.outputHelp();
  console.log();
  console.log("Quick start:");
  console.log(colors.dim("  mp login                    # Authenticate with marketplace"));
  console.log(colors.dim("  mp data pull --round current # Download training data"));
  console.log(colors.dim("  mp train start --task signal # Start training run"));
  console.log(colors.dim("  mp init --template runpod   # Create new model from template"));
  console.log(colors.dim("  mp validate                 # Test your model endpoints"));
  console.log(colors.dim("  mp dev                      # Run in development mode"));
  console.log(colors.dim("  mp deploy --provider runpod # Deploy to RunPod"));
  console.log(colors.dim("  mp register --name MyModel  # Register in marketplace"));
  console.log(colors.dim("  mp link-infra               # Connect to live trading"));
}
