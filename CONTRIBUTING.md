# Contributing to Attendance Dashboard

Thank you for your interest in contributing to the Attendance Dashboard project! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL 15+
- Redis (optional but recommended)
- Git

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/attendance-dashboard.git
   cd attendance-dashboard
   ```

2. **Install Dependencies**
   ```bash
   npm run setup
   ```

3. **Environment Setup**
   ```bash
   # Copy environment files
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   
   # Update with your local settings
   ```

4. **Database Setup**
   ```bash
   # Create database
   createdb attendance_dashboard
   
   # Run migrations
   psql -d attendance_dashboard -f database/init.sql
   ```

5. **Start Development**
   ```bash
   npm run dev
   ```

## 📝 Development Guidelines

### Code Style

- **TypeScript**: Use TypeScript for all new frontend code
- **ESLint**: Follow the configured ESLint rules
- **Prettier**: Code formatting is enforced
- **Naming**: Use descriptive, camelCase for variables and functions

### Git Workflow

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Write clean, documented code
   - Add tests for new functionality
   - Update documentation as needed

3. **Commit Guidelines**
   ```bash
   # Use conventional commits
   git commit -m "feat: add new leave approval system"
   git commit -m "fix: resolve authentication bug"
   git commit -m "docs: update API documentation"
   ```

4. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

### Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes

## 🧪 Testing

### Running Tests

```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test

# Integration tests
npm run test:integration
```

### Writing Tests

- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test API endpoints and database interactions
- **E2E Tests**: Test complete user workflows

### Test Requirements

- All new features must include tests
- Bug fixes should include regression tests
- Maintain or improve test coverage

## 📚 Documentation

### Code Documentation

- Use JSDoc for functions and classes
- Include inline comments for complex logic
- Update README.md for significant changes

### API Documentation

- Document all new API endpoints
- Include request/response examples
- Update Postman collections

## 🏗️ Architecture Guidelines

### Frontend (React + TypeScript)

```
src/
├── components/     # Reusable UI components
├── pages/         # Page components
├── contexts/      # React contexts
├── hooks/         # Custom hooks
├── utils/         # Utility functions
└── types/         # TypeScript definitions
```

### Backend (Node.js + Express)

```
backend/
├── routes/        # API route handlers
├── middleware/    # Custom middleware
├── config/        # Configuration files
├── utils/         # Utility functions
└── workers/       # Background workers
```

### Database Design

- Use migrations for schema changes
- Follow PostgreSQL best practices
- Include proper indexing
- Document complex queries

## 🔒 Security Guidelines

### Authentication & Authorization

- Always validate user permissions
- Use JWT tokens properly
- Implement rate limiting
- Sanitize user inputs

### Data Protection

- Never log sensitive data
- Use parameterized queries
- Validate all inputs
- Follow OWASP guidelines

## 📋 Pull Request Process

### Before Submitting

- [ ] Tests pass locally
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] No merge conflicts
- [ ] Branch is up to date with main

### PR Requirements

1. **Clear Description**: Explain what changes were made and why
2. **Issue Reference**: Link to related issues
3. **Testing Notes**: Describe how to test the changes
4. **Screenshots**: Include UI changes screenshots
5. **Breaking Changes**: Document any breaking changes

### Review Process

1. **Automated Checks**: CI/CD pipeline must pass
2. **Code Review**: At least one approval required
3. **Testing**: Reviewer should test functionality
4. **Documentation**: Verify docs are updated

## 🚀 Performance Guidelines

### Frontend Performance

- Use React.memo for expensive components
- Implement lazy loading for routes
- Optimize bundle size with code splitting
- Use virtualization for large lists

### Backend Performance

- Use database indexing effectively
- Implement caching strategies
- Monitor query performance
- Use connection pooling

### General Guidelines

- Profile before optimizing
- Measure performance impact
- Consider scalability implications
- Document performance decisions

## 🐛 Bug Reports

### Before Reporting

1. Check existing issues
2. Reproduce consistently
3. Test in different environments
4. Gather relevant information

### Good Bug Reports Include

- Clear, descriptive title
- Steps to reproduce
- Expected vs actual behavior
- Environment details
- Screenshots/logs if helpful

## ✨ Feature Requests

### Before Requesting

1. Check existing issues and roadmap
2. Consider if it fits project scope
3. Think about implementation complexity
4. Consider user impact

### Good Feature Requests Include

- Clear problem statement
- Proposed solution
- Alternative approaches considered
- User stories or use cases
- Mock-ups if applicable

## 📞 Getting Help

### Resources

- **Documentation**: Check the `/docs` folder
- **Issues**: Search existing GitHub issues
- **Discussions**: Use GitHub Discussions for questions

### Communication

- Be respectful and constructive
- Provide context and details
- Follow up on responses
- Help others when possible

## 🏆 Recognition

Contributors will be recognized in:
- GitHub contributor list
- Release notes for significant contributions
- Project documentation

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to the Attendance Dashboard project! 🎉
