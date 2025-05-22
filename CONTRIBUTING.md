# Contributing to Project Mosaic

Thank you for your interest in contributing to Project Mosaic! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## How to Contribute

### Reporting Bugs

If you find a bug, please report it by creating an issue on GitHub. When filing an issue, make sure to answer these questions:

1. What version of Project Mosaic are you using?
2. What operating system and processor architecture are you using?
3. What did you do?
4. What did you expect to see?
5. What did you see instead?

### Suggesting Enhancements

If you have an idea for a new feature or an enhancement to an existing feature, please create an issue on GitHub. Provide as much detail as possible about your suggestion, including:

1. A clear and descriptive title
2. A detailed description of the proposed feature
3. Any relevant examples or mockups
4. An explanation of why this feature would be useful

### Pull Requests

We actively welcome your pull requests!

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Submit your pull request!

### Development Workflow

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/project-mosaic.git
   cd project-mosaic
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

4. Make your changes and commit them:
   ```bash
   git commit -m "Description of your changes"
   ```

5. Push your branch to GitHub:
   ```bash
   git push origin feature/your-feature-name
   ```

6. Open a pull request on GitHub.

## Development Guidelines

### Code Style

We use ESLint and Prettier to enforce a consistent code style. Before submitting your code, make sure it follows our style guidelines by running:

```bash
npm run lint
npm run format
```

### Testing

All new features and bug fixes should include tests. We use Jest for testing. Run the tests with:

```bash
npm test
```

### Documentation

- All new features should include documentation.
- Update the README.md if necessary.
- Add JSDoc comments to all functions and classes.

### Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

## Module Development

If you're developing a new module for Project Mosaic, please follow these additional guidelines:

1. Create a new directory in the appropriate module type directory (e.g., `src/modules/personality` for personality modules).
2. Implement the required interfaces for your module type.
3. Include comprehensive documentation.
4. Add tests for your module.
5. Create an example configuration.

For more details, see the [Module Development Guide](docs/module-development.md).

## License

By contributing to Project Mosaic, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).

## Questions?

If you have any questions about contributing, please open an issue or reach out to the maintainers.

Thank you for your contribution!
