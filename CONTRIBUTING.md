# Contributing to NeuroNetIQ ML Marketplace

Thank you for your interest in contributing to the NeuroNetIQ ML Marketplace! This guide will help you get started.

## 🚀 Quick Start

### **Prerequisites**

- Node.js 20.11.0+
- pnpm 10.14.0+
- Git
- Docker (for template testing)

### **Development Setup**

```bash
# Clone repository
git clone https://github.com/NeuroNetIQ/trader-marketplace.git
cd trader-marketplace

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Test CLI locally
./packages/marketplace-cli/bin/mp.js --help
```

### **Development Workflow**

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and test
pnpm build
pnpm test

# Run E2E tests
./scripts/e2e-test.sh

# Commit with conventional commits
git commit -m "feat(cli): add new command for X"

# Push and create PR
git push origin feature/your-feature-name
```

## 📋 **Contribution Types**

### **🐛 Bug Reports**

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md) and include:

- **Environment**: OS, Node.js version, CLI version
- **Steps to reproduce**: Minimal example
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Logs**: Relevant error messages (with tokens redacted)

### **✨ Feature Requests**

Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md) and include:

- **Problem**: What problem does this solve?
- **Solution**: Proposed implementation approach
- **Alternatives**: Other solutions considered
- **Impact**: Who benefits and how?

### **📚 Documentation**

Documentation improvements are always welcome:

- **Clarity**: Simplify complex explanations
- **Examples**: Add working code examples
- **Completeness**: Fill gaps in coverage
- **Accuracy**: Fix outdated information

### **🔧 Code Contributions**

We welcome code contributions for:

- **CLI Commands**: New functionality for `mp` command
- **Templates**: Additional RunPod templates for different use cases
- **Examples**: Working integration examples
- **Tests**: Improved test coverage
- **Bug Fixes**: Fixes for reported issues

## 🏗️ **Repository Structure**

```
trader-marketplace/
├── packages/
│   ├── marketplace-contracts/    # TypeScript contracts and schemas
│   └── marketplace-cli/          # CLI tool implementation
├── templates/
│   ├── runpod-signal-http/      # Inference deployment template
│   └── runpod-signal-train/     # Training job template
├── examples/
│   ├── python-signal-writer/    # Python integration example
│   └── node-heartbeat-sender/   # Node.js monitoring example
├── docs/                        # Documentation
├── scripts/                     # Automation scripts
└── .github/                     # GitHub configuration
```

## 📝 **Code Standards**

### **TypeScript**

- **Strict Mode**: All TypeScript must pass strict type checking
- **ESLint**: Follow configured linting rules
- **Formatting**: Use Prettier for consistent formatting
- **Exports**: Properly export all public APIs

### **Commit Messages**

We use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Format: type(scope): description
feat(cli): add training status command
fix(contracts): correct signal validation schema
docs(quickstart): update authentication steps
chore(deps): update dependencies
```

**Types:**
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `chore`: Maintenance tasks
- `test`: Test additions or fixes
- `refactor`: Code refactoring

**Scopes:**
- `cli`: Marketplace CLI
- `contracts`: Contract schemas
- `templates`: RunPod templates
- `docs`: Documentation
- `examples`: Code examples

### **Testing Requirements**

**All contributions must include:**

- ✅ **Unit Tests**: For new functions and methods
- ✅ **Integration Tests**: For CLI commands and API interactions
- ✅ **Type Tests**: For TypeScript interfaces and schemas
- ✅ **Documentation**: Updated docs for new features

**Test Commands:**
```bash
# Run all tests
pnpm test

# Test specific package
pnpm --filter @neuronetiq/marketplace-cli test

# Run E2E tests
./scripts/e2e-test.sh

# CLI health check
mp doctor
```

## 🔍 **Pull Request Process**

### **Before Submitting**

- [ ] Code builds successfully: `pnpm build`
- [ ] All tests pass: `pnpm test`
- [ ] TypeScript compiles: `pnpm typecheck`
- [ ] E2E tests pass: `./scripts/e2e-test.sh`
- [ ] Documentation updated for new features
- [ ] Conventional commit messages used

### **PR Requirements**

- **Title**: Use conventional commit format
- **Description**: Use the PR template
- **Tests**: Include test coverage for changes
- **Documentation**: Update relevant docs
- **Breaking Changes**: Clearly marked and documented

### **Review Process**

1. **Automated Checks**: CI must pass
2. **Code Review**: At least one maintainer approval
3. **Security Review**: For security-sensitive changes
4. **Documentation Review**: For user-facing changes
5. **Final Testing**: Manual testing of critical paths

## 🛠️ **Development Guidelines**

### **CLI Development**

**Command Structure:**
```typescript
// Follow existing pattern in src/commands/
import { Command } from "commander";
import colors from "picocolors";

const myCommand = new Command("my-command")
  .description("Description of what this does")
  .option("--flag <value>", "Description of flag")
  .action(async (options) => {
    // Implementation
  });

export default myCommand;
```

**Error Handling:**
```typescript
// Always provide helpful error messages
if (!config.apiKey) {
  console.log(colors.red("❌ Not authenticated. Run 'mp login' first."));
  process.exit(1);
}
```

### **Contract Development**

**Schema Pattern:**
```typescript
import { z } from "zod";

export const MySchema = z.object({
  required_field: z.string().min(1),
  optional_field: z.number().optional(),
});

export type MyType = z.infer<typeof MySchema>;
```

**Validation:**
```typescript
const validation = MySchema.safeParse(data);
if (!validation.success) {
  return { error: validation.error.issues };
}
```

### **Template Development**

**Health Endpoints:**
```typescript
// Always implement health and readiness
app.get("/health", () => ({ status: "ok", version: "1.0.0" }));
app.get("/ready", () => ({ status: "ready", model_loaded: true }));
```

**Environment Configuration:**
```typescript
// Use environment variables for all configuration
const config = {
  port: Number(process.env.PORT || 8080),
  vendorId: process.env.VENDOR_ID,
  deploymentId: process.env.DEPLOYMENT_ID,
};
```

## 🎯 **Contribution Areas**

### **High Impact**

- **CLI Commands**: New functionality for common workflows
- **Template Improvements**: Better performance, monitoring, error handling
- **Documentation**: Clear examples and troubleshooting guides
- **Security**: Token management, authentication improvements

### **Medium Impact**

- **Test Coverage**: Additional test scenarios
- **Performance**: Optimization and benchmarking
- **Integrations**: Support for additional cloud providers
- **Monitoring**: Enhanced metrics and observability

### **Good First Issues**

Look for issues labeled `good first issue`:

- Documentation improvements
- Small CLI enhancements
- Example code additions
- Test case additions

## 📞 **Getting Help**

**Community Support:**
- 💬 **Discord**: [Join our community](https://discord.gg/neuronetiq)
- 🐛 **GitHub Issues**: [Search existing issues](https://github.com/NeuroNetIQ/trader-marketplace/issues)
- 📧 **Email**: support@neuronetiq.com

**Development Questions:**
- 🔧 **Technical**: Create a discussion in the repository
- 📚 **Documentation**: Suggest improvements via issues
- 💡 **Ideas**: Share in community Discord

## 🏆 **Recognition**

Contributors will be recognized:

- **README**: Contributors section
- **Releases**: Acknowledgment in release notes
- **Community**: Highlighted in Discord and social media
- **Swag**: NeuroNetIQ contributor merchandise

## 📜 **Code of Conduct**

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold this code.

## 📄 **License**

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

**Thank you for contributing to the future of trading AI!** 🚀
