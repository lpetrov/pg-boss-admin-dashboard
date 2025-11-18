# Contributing to pg-boss-admin-dashboard

First off, thank you for considering contributing to pg-boss-admin-dashboard! It's people like you that make pg-boss-admin-dashboard such a great tool.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to conduct@your-email.com.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

* **Use a clear and descriptive title**
* **Describe the exact steps to reproduce the problem**
* **Provide specific examples to demonstrate the steps**
* **Describe the behavior you observed after following the steps**
* **Explain which behavior you expected to see instead and why**
* **Include screenshots if possible**
* **Include your environment details** (OS, Node.js version, PostgreSQL version)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

* **Use a clear and descriptive title**
* **Provide a step-by-step description of the suggested enhancement**
* **Provide specific examples to demonstrate the steps**
* **Describe the current behavior and explain which behavior you expected**
* **Explain why this enhancement would be useful**

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes
5. Make sure your code follows the existing style
6. Issue that pull request!

## Development Setup

1. Fork and clone the repository
```bash
git clone https://github.com/yourusername/pg-boss-admin-dashboard.git
cd pg-boss-admin-dashboard
```

2. Install dependencies
```bash
npm install
```

3. Set up your environment
```bash
cp .env.example .env
# Edit .env with your PostgreSQL connection
```

4. Run in development mode
```bash
npm run dev
```

## Project Structure

```
pg-boss-admin-dashboard/
├── bin/                    # CLI executable
├── public/                 # Frontend static files
├── client/                 # React version (future)
├── index.js               # Express server
└── package.json           # Package configuration
```

## Styleguides

### Git Commit Messages

* Use the present tense ("Add feature" not "Added feature")
* Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
* Limit the first line to 72 characters or less
* Reference issues and pull requests liberally after the first line

### JavaScript Styleguide

* 2 spaces for indentation
* No unused variables
* Use semicolons
* Use single quotes for strings
* Add trailing commas in multi-line objects/arrays

### Testing

* Write tests for new features
* Ensure all tests pass before submitting PR
* Aim for good test coverage

## Additional Notes

### Issue and Pull Request Labels

* `bug` - Something isn't working
* `enhancement` - New feature or request
* `documentation` - Improvements or additions to documentation
* `good first issue` - Good for newcomers
* `help wanted` - Extra attention is needed
* `question` - Further information is requested

Thank you for contributing to pg-boss-admin-dashboard! 🎉