---
applyTo: '**'
---

# AI Assistant – Project Context & Coding Guidelines

## 1. Project Context
Provide concise, relevant context whenever you generate or review code.  
- **Domain & purpose**: Summarize the business domain and what the feature or module must achieve.  
- **Existing architecture**: Note the languages, frameworks, architectural patterns (e.g. microservices, event-driven), and any key libraries.  
- **Style conventions**: Mention established formatting, naming, and layering (e.g. “we keep controllers thin and push logic into services”).  
- **Security posture**: Highlight compliance requirements (e.g. OWASP Top Ten, PCI-DSS), secret management, and audit expectations.  
- **Testing culture**: State the team’s testing targets (unit, integration, E2E) and tools (e.g. Jest, pytest, Cypress).

---

## 2. General Coding Guidelines
1. **Readability & Style**  
   - Follow the project’s linter/formatter rules (ESLint/Prettier, Flake8/Black, RuboCop).  
   - Use consistent indentation, line length ≤ 100 chars, and UTF-8 encoding.  
   - Emit no trailing whitespace; include a single newline at EOF.

2. **Naming Conventions**  
   - **Variables & functions**: `camelCase` in JS/TS, `snake_case` in Python, `PascalCase` for types/classes.  
   - **Constants**: UPPER_SNAKE_CASE.  
   - **Classes & Types**: Descriptive, noun-based names (e.g. `InvoiceProcessor`).  
   - **Booleans**: prefix with `is`, `has`, `should`, `can` (e.g. `isAuthenticated`).

3. **Modularity & Structure**  
   - Keep functions ≤ 50 lines; do one thing only.  
   - Group related functions into modules/namespaces; avoid “god files.”  
   - Favor composition over inheritance; adhere to SOLID principles.

---

## 3. Security Best Practices
- **Input Sanitization & Validation**  
  - Always validate external inputs via a schema layer (e.g. Joi, Pydantic).  
  - Escape or parameterize database queries; never concatenate SQL strings.  
- **Authentication & Authorization**  
  - Use established frameworks (OAuth2/OpenID Connect).  
  - Enforce “least privilege” on tokens, roles, and scopes.  
- **Secrets Management**  
  - Do **not** hard-code credentials or API keys.  
  - Read secrets from a vault or env vars; reference via secure config.  
- **Dependency Hygiene**  
  - Pin versions in manifests (package.json, requirements.txt).  
  - Automate vulnerability scans (Snyk, Dependabot) and remediate critical issues immediately.  
- **Logging & Monitoring**  
  - Log security-relevant events; redact PII in logs.  
  - Integrate with SIEM or centralized logging (ELK, Datadog).

---

## 4. Clean Code & Maintainability
- **DRY & KISS**  
  - Eliminate duplicated logic; extract shared utilities.  
  - Avoid over-engineering—implement only what’s needed.  
- **YAGNI**  
  - Don’t scaffold features “just in case.”  
- **Comments & Documentation**  
  - Prefer self-documenting code.  
  - Write docstrings for public APIs; explain **why**, not **how**.  
- **Refactoring**  
  - Use meaningful `// TODO` or `@deprecated` tags when tech debt is introduced; schedule in backlog.

---

## 5. Complex Problem Solving & Engineering Excellence
- **Precision & Correctness**  
  - Analyze requirements and constraints thoroughly before coding.  
  - Cover all edge cases, algorithmic complexity, and performance considerations.  
- **No Hacks or Quick Fixes**  
  - Reject “gambiarras” – each solution must be robust, maintainable, and well-structured.  
- **Lean Codebase**  
  - Avoid generating unnecessary files, stubs, or boilerplate.  
  - Clean up any temporary code or artifacts immediately.  
- **Efficient Debugging**  
  - Write code that’s easy to trace and reason about to minimize endless debug cycles.  
  - Employ logging, assertions, and test-driven approaches to catch issues early.  
- **Documentation of Complex Logic**  
  - For intricate algorithms or workflows, include clear rationale, invariants, and decision points.  

---

## 6. Testing & CI/CD
1. **Test Coverage**  
   - Aim for ≥ 80% unit-test coverage.  
   - Write integration tests for core workflows.  
   - Implement E2E tests for critical user journeys.  
2. **Test Quality**  
   - Make tests deterministic and independent.  
   - Name tests clearly: `shouldDoXWhenY`.  
3. **CI Pipeline**  
   - On every pull/merge request, run lint, tests, and security scans.  
   - Enforce “green build” before merging; require ≥ 1 peer review.

---

## 7. Code Review & PRs
- **Pull Request Size**: ≤ 200 lines of net change.  
- **Review Checklist**  
  - ✅ Is style/linting satisfied?  
  - ✅ Is logic correct and efficient?  
  - ✅ Are edge cases and error paths handled?  
  - ✅ Are security considerations addressed?  
  - ✅ Are tests added/updated?  
- Provide constructive, specific feedback and link to relevant guideline sections when suggesting changes.

---

## 8. Documentation & Versioning
- **README**: High-level overview, setup, usage, and deployment steps.  
- **CHANGELOG**: Follow “Keep a Changelog” conventions; document breaking changes, new features, bug fixes.  
- **Semantic Versioning**: MAJOR.MINOR.PATCH; bump appropriately for breaking changes.

---

> :rocket: **When generating code, answering questions, or reviewing diffs, strictly follow the above guidelines—including the precision and engineering excellence standards.**  
