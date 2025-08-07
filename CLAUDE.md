# Claude Configuration

## STARTUP PROTOCOL - MUST EXECUTE EVERY SESSION

### 1. Permission Check (FIRST PRIORITY)
**ALWAYS check if Claude Code was started with proper permissions:**
- If NOT started with `--dangerously-skip-permissions`, issue this warning:
  ```
  ⚠️ WARNING: Claude Code may not have been started with --dangerously-skip-permissions
  This could cause file access issues. If you experience permission errors, 
  please restart Claude Code with:
  
  claude --dangerously-skip-permissions
  ```

### 2. Project Selection (SECOND PRIORITY)
**ALWAYS ask the user at startup:**
```
Welcome! What project are we working on today?

Please specify:
1. The project name or path
2. A brief description if this is a new project
```

### 3. Multi-Agent Detection (THIRD PRIORITY)
**After project selection, ALWAYS:**
1. Check for `coordination.txt` or similar coordination files in the project root
2. If multi-agent setup is detected, list available agents and ask:
   ```
   I've detected a multi-agent setup for this project.
   
   Available agents:
   - Claude-A: [Role description from coordination.txt]
   - Claude-B: [Role description from coordination.txt]
   - Claude-C: [Role description from coordination.txt]
   
   Which agent should I act as for this session?
   ```
3. If no coordination file exists, proceed as a single agent
4. Once agent is selected, follow that agent's specific guidelines from coordination.txt

### 4. Context Loading
After agent selection:
- Load the selected agent's context from coordination.txt
- Review recent work and current phase
- Announce current role and ready status

## Development Guidelines

- Check coordination.txt for multi-agent coordination
- Follow the selected agent's specific role and responsibilities

### Commit Policy
- **MANDATORY**: Every agent MUST commit and push changes after making file modifications
- **Commit Format**: Use conventional commit format with short, meaningful messages
- **Auto-commit & Push**: All file changes should be automatically committed and pushed without user prompts
- **Batching**: Related changes should be committed together (e.g., feature + tests + docs)
- **Frequency**: Wait at least 10 minutes between commits unless explicitly requested by user

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
1. Commit AND push after completing related file modifications
2. Use descriptive but concise commit messages
3. Include relevant scope when applicable
4. Follow conventional commit format
5. Group related changes in a single commit (feature + tests + docs)
6. Wait at least 10 minutes between commits (unless user requests immediate commit)
7. Execute `git add`, `git commit`, and `git push` as a single workflow

#### Example Workflow:
```bash
# After creating a new feature with tests and docs
git add src/components/NewComponent.tsx src/tests/NewComponent.test.tsx docs/components.md
git commit -m "feat(components): add user profile component with tests"
git push origin main

# After fixing a bug and updating related tests
git add src/services/auth.ts src/tests/auth.test.ts
git commit -m "fix(auth): resolve token expiration handling"
git push origin main

# After documentation updates
git add docs/API.md docs/README.md
git commit -m "docs(api): update authentication endpoints documentation"
git push origin main
```

### Automatic Commit Requirements

Every agent should automatically run these commands after completing related changes:
```bash
git add <related files>
git commit -m "<appropriate commit message>"
git push origin main
```

**Timing Rules:**
- Group related changes together in one commit
- Wait at least 10 minutes between commits
- No user confirmation required - commit and push automatically
- Exception: Immediate commit if user explicitly requests it

### Quality Standards
- Keep messages under 72 characters for the subject line
- Use imperative mood ("add" not "added")
- Be specific about what changed
- Include scope when it helps clarify the change area

This ensures complete version control and allows for easy tracking of all development progress.