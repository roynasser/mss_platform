# Claude Configuration

## Development Guidelines

### Commit Policy
- **MANDATORY**: Every agent MUST commit changes immediately after making any code or documentation modifications
- **Commit Format**: Use conventional commit format with short, meaningful messages
- **Auto-commit**: All file changes should be automatically committed without user prompts

### Commit Message Format
```
<type>(<scope>): <description>

Examples:
feat(auth): add MFA support
fix(api): resolve user creation validation
docs(readme): update setup instructions
refactor(db): optimize user queries
test(auth): add login flow tests
chore(deps): update dependencies
```

### Commit Types
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style/formatting
- `refactor`: Code refactoring
- `test`: Adding/updating tests
- `chore`: Build/tooling changes
- `security`: Security improvements

### Agent-Specific Guidelines

#### All Agents Must:
1. Commit immediately after every file modification
2. Use descriptive but concise commit messages
3. Include relevant scope when applicable
4. Follow conventional commit format
5. Never batch multiple unrelated changes

#### Example Workflow:
```bash
# After creating a new component
git add src/components/NewComponent.tsx
git commit -m "feat(components): add user profile component"

# After updating documentation
git add docs/API.md
git commit -m "docs(api): add authentication endpoints"

# After fixing a bug
git add src/services/auth.ts
git commit -m "fix(auth): resolve token expiration handling"
```

### Automatic Commit Requirements

Every agent should automatically run these commands after making changes:
```bash
git add .
git commit -m "<appropriate commit message>"
```

No user confirmation required - commit immediately and automatically.

### Quality Standards
- Keep messages under 72 characters for the subject line
- Use imperative mood ("add" not "added")
- Be specific about what changed
- Include scope when it helps clarify the change area

This ensures complete version control and allows for easy tracking of all development progress.