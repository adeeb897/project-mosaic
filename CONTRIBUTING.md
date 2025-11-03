# Contributing to Project Mosaic

Thank you for your interest in contributing to Project Mosaic! This document provides guidelines and instructions for contributing.

## Ways to Contribute

- **Bug Reports**: Found a bug? Open an issue with details
- **Feature Requests**: Have an idea? Share it in discussions
- **Code Contributions**: Submit pull requests
- **Documentation**: Improve docs, add examples
- **Plugins**: Create custom agents, MCP servers, providers
- **Testing**: Write tests, report issues

## Getting Started

### 1. Fork and Clone

```bash
# Fork the repository on GitHub
git clone https://github.com/your-username/project-mosaic.git
cd project-mosaic
```

### 2. Set Up Development Environment

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your API keys

# Start development services
docker-compose up -d

# Run migrations
npm run db:migrate

# Start development server
npm run dev
```

### 3. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

## Development Guidelines

### Code Style

- Use TypeScript for all code
- Follow existing code style (Prettier + ESLint)
- Write meaningful variable and function names
- Add comments for complex logic

```bash
# Format code
npm run format

# Lint code
npm run lint

# Type check
npm run typecheck
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new agent capability
fix: resolve sandbox timeout issue
docs: update deployment guide
refactor: improve event bus performance
test: add tests for MCP servers
```

### Testing

- Write tests for new features
- Ensure existing tests pass
- Aim for good test coverage

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Check coverage
npm run test:coverage
```

## Pull Request Process

### 1. Before Submitting

- [ ] Code follows style guidelines
- [ ] All tests pass
- [ ] New tests added for new features
- [ ] Documentation updated
- [ ] No merge conflicts
- [ ] Commits are clean and meaningful

### 2. Submit PR

- Fill out the PR template completely
- Link related issues
- Add screenshots/videos if UI changes
- Request review from maintainers

### 3. Code Review

- Address review comments
- Keep discussion constructive
- Be patient and respectful

### 4. After Approval

- Squash commits if requested
- Maintainers will merge when ready

## Plugin Development

See [EXTENSIBILITY.md](./EXTENSIBILITY.md) for detailed plugin development guide.

### Quick Start

```bash
# Create plugin directory
mkdir -p plugins/my-plugin

# Create plugin
cd plugins/my-plugin
npm init -y

# Implement plugin interface
# See examples in plugins/examples/
```

### Plugin Checklist

- [ ] Implements correct plugin interface
- [ ] Includes package.json with metadata
- [ ] Has README with usage instructions
- [ ] Includes tests
- [ ] Documented configuration options
- [ ] Example usage provided

## Documentation

### Updating Docs

- Keep README.md up-to-date
- Update ARCHITECTURE.md for system changes
- Update DEPLOYMENT.md for deployment changes
- Add examples to EXTENSIBILITY.md

### Writing Style

- Clear and concise
- Include code examples
- Use proper formatting
- Add diagrams if helpful

## Community Guidelines

### Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- No harassment or discrimination

### Communication

- **GitHub Issues**: Bug reports, feature requests
- **GitHub Discussions**: Questions, ideas, help
- **Discord**: Real-time chat (coming soon)

## Release Process

Maintainers handle releases:

1. Update version in package.json
2. Update CHANGELOG.md
3. Create release branch
4. Tag release
5. Publish to npm (if applicable)
6. Announce release

## License

By contributing, you agree that your contributions will be licensed under the GNU GPL-3.0 License.

## Questions?

- Check existing issues and discussions
- Ask in GitHub Discussions
- Join our Discord (coming soon)

## Recognition

Contributors will be:
- Listed in README.md
- Credited in release notes
- Celebrated in the community

Thank you for contributing to Project Mosaic!
