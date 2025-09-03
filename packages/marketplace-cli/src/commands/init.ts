import { Command } from "commander";
import prompts from "prompts";
import colors from "picocolors";
import { join } from "path";
import { getAvailableTemplates, createTemplate } from "../lib/templates.js";

const init = new Command("init")
  .description("Initialize a new model from template")
  .option("--template <name>", "Template name")
  .option("--name <name>", "Project name")
  .option("--dir <path>", "Target directory")
  .action(async (options) => {
    console.log(colors.cyan("🚀 Initialize New Model"));
    console.log();

    const templates = getAvailableTemplates();
    let templateName = options.template;
    let projectName = options.name;
    let targetDir = options.dir;

    // Interactive prompts if options not provided
    if (!templateName) {
      const response = await prompts({
        type: "select",
        name: "template",
        message: "Select a template:",
        choices: templates.map(t => ({
          title: t.name,
          description: t.description,
          value: t.name,
        })),
      });

      if (!response.template) {
        console.log(colors.red("❌ Template selection cancelled"));
        process.exit(1);
      }

      templateName = response.template;
    }

    if (!projectName) {
      const response = await prompts({
        type: "text",
        name: "name",
        message: "Project name:",
        initial: "my-trading-model",
        validate: (value) => value.length > 0 || "Project name is required",
      });

      if (!response.name) {
        console.log(colors.red("❌ Project creation cancelled"));
        process.exit(1);
      }

      projectName = response.name;
    }

    if (!targetDir) {
      targetDir = join(process.cwd(), projectName);
      
      const response = await prompts({
        type: "text",
        name: "dir",
        message: "Target directory:",
        initial: targetDir,
      });

      if (response.dir !== undefined) {
        targetDir = response.dir || targetDir;
      }
    }

    try {
      console.log(colors.dim(`Creating project from template "${templateName}"...`));
      
      await createTemplate(templateName, targetDir);
      
      console.log(colors.green("✅ Project created successfully!"));
      console.log();
      console.log("Next steps:");
      console.log(colors.cyan(`  cd ${projectName}`));
      console.log(colors.cyan("  npm install"));
      console.log(colors.cyan("  mp validate"));
      console.log(colors.cyan("  mp dev"));
      console.log();
      console.log("Files created:");
      
      const template = templates.find(t => t.name === templateName)!;
      Object.keys(template.files).forEach(file => {
        console.log(colors.dim(`  ${file}`));
      });
      
    } catch (error) {
      console.log(colors.red("❌ Failed to create project:"), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

export default init;
