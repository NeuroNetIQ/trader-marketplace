#!/usr/bin/env node

// Bootstrap the CLI from compiled TypeScript
import("../dist/index.js").catch(err => {
  console.error("Failed to start CLI:", err.message);
  process.exit(1);
});
