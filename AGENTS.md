# AGENTS.md

---

## Agent Operating Protocol for the `todo` Repository

This document provides comprehensive build, lint, type, formatting, and code style guidelines for this codebase. It is **optimized for coding agents** operating in this repository.

## 1. Build, Lint, Format, and Type Checking Commands

### Development & Build
- **Start local development server:**
  ```bash
  npm run dev
  ```
- **Full production build:**
  ```bash
  npm run build
  ```
- **Start production server:**
  ```bash
  npm run start
  ```

### Linting
- **Run all linters (ESLint):**
  ```bash
  npm run lint
  ```
- **Fix fixable lint errors:**
  ```bash
  npx eslint . --fix
  ```

### Formatting
- **Format all code (Biome):**
  ```bash
  npm run format
  ```
- **Check formatting (without write):**
  ```bash
  npx biome format .
  ```

### Type Checking
- **Check all types:**
  ```bash
  npm run typecheck
  ```
- **Incremental typecheck:**
  ```bash
  npx tsc --noEmit --watch
  ```

### Tests
- **Note:** There is no direct test script detected in package.json. In Next.js 14+, test config is often local. Agents should check for a `test` script or use conventions below.
- **If using Jest/Playwright/Cypress:**
  ```bash
  npm test
  # or
  npx jest path/to/file.test.tsx
  # or
  npx playwright test path/to/test.spec.ts
  ```
- **For Next.js App Router route handlers:** Use appropriate test runner once it is available, or check for test files in /tests or /__tests__.
- **To run a single test (if using Jest):**
  ```bash
  npx jest path/to/file.test.tsx -t 'test name'
  ```

---

## 2. Coding Style Guidelines

### Imports
- **Use ES modules:** Always use `import ... from '...'`.
- **Group imports:** Order as:
  1. Node built-ins
  2. Third-party modules
  3. Aliased paths (e.g., @/utils)
  4. Relative imports
- **Side effect imports:** One per file, at the top if needed.
- **Do not use `require`:** Only use `import` syntax.

### Formatting (Biome)
- **Auto-format on save:** All agents should run `npm run format` before changes are submitted.
- **No semicolons:** Enforced by Biome (unless exceptions escalate or project style changes).
- **Max line length:** 100-120 characters (default Biome rule unless config states otherwise).
- **Use single quotes** (unless project config states otherwise).
- **Trailing commas:** Prefer trailing commas when valid (e.g., multiline objects/arrays).
- **No unused variables:** Remove unused, import only what you use.
- **Indentation:** 2 spaces.

### Types (TypeScript)
- **Prefer explicit types:** Annotate all exported functions, variables, and props; use type inference for locals.
- **Never use `any`:** Replace with narrow alternative or generic as appropriate.
- **Prefer interfaces for props:** Use `interface` for public-facing types and component props.
- **Prefer `type` for unions/intersections:**
- **Use readonly/const enums when needed.**
- **No implicit `any`.**
- **Enable `strictNullChecks`.**

### Naming Conventions
- **Files/folders:** kebab-case (`my-component.tsx`)
- **Functions, variables:** camelCase
- **Component names:** PascalCase (`TodoList`)
- **Type/interface:** PascalCase (`User`, `TodoItem`)
- **Constants:** UPPER_SNAKE_CASE if truly constant
- **Props:** camelCase

### React/Next.js Components
- **Component structure:** Use function components.
- **Hooks:** Only use hooks at top-level in functions (never conditionally inside loops).
- **Props destructuring:** Destructure at parameter level for clarity.
- **DefaultProps:** Use default values via destructuring or `defaultProps` (legacy, not preferred).
- **Prefer co-location:** Components and styles/files should reside close to usage when possible.
- **Never mutate props.**
- **Return JSX, use fragments if needed.**

### Tailwind CSS Usage
- **Class names:** Use utility classes rather than custom CSS when feasible.
- **Responsiveness:** Compose classes for mobile-first design.
- **No style duplication:** Extract reusable sets as classnames/helpers if reused often.
- **Order classes:** Group related classes visually (flex, spacing, color, etc.)

### Error Handling
- **Explicit error boundaries:** For async/await, catch with try/catch and surface as user/message/log as appropriate.
- **Log errors informatively, never silently ignore errors.**
- **Propagate errors up unless handled meaningfully.**

### Linting (ESLint + Next.js)
- **Fix all lint errors:** Never commit with lint problems.
- **Respect next.js config:** Avoid custom webpack/hard overrides unless truly needed.
- **Disable rules with comments only justifiably.**

---

## 3. Miscellaneous Guidelines

#### Documentation
- Top-level exported functions/components/types should have concise doc comments.
- Describe intention, not implementation.
- Prefer type-safe JSdoc annotations.

#### File Structure
- Group files by feature when possible.
- Index files should only re-export, not implement logic.
- Avoid deep nested folder structures.

#### Contributions & Merging
- All PRs must pass:
  - Lint
  - Typecheck
  - Format
  - Tests (if applicable)

---

## 4. Cursor/Copilot/Other Rule Files
- **No Cursor or Copilot rules are present in this repository as of this writing.**
- Agents are **free to apply the above project and prevailing ecosystem standards.**

---

# End of AGENTS.md

_Edit this document if project conventions change. Coding agents should always refer to the latest version._
