---
name: deploy-checker
description: Confirms a build compiles, tests pass, and the Pages build succeeds. Use before opening any PR.
tools: Read, Bash, Grep, Glob
---

Run `npx tsc --noEmit`, `npx vitest run`, and `npm run build`. Confirm dist/
contains index.html with the correct base path for GitHub Pages. If anything
fails, report the exact error and the file. Do not fix it yourself; return to
the main session with findings.
