# UI Guidelines Audit Tool

Automated audit tool for React components following Vercel Web Interface Guidelines.

## Overview

This tool analyzes React components against 7 categories of UI guidelines:
- **Interactions**: Keyboard navigation, focus management, ARIA attributes
- **Animations**: Reduced motion support, GPU acceleration
- **Layout**: Responsive design, safe areas, modern layout techniques
- **Content**: Empty states, loading states, internationalization
- **Forms**: Label association, validation, autocomplete, semantic inputs
- **Performance**: Re-render optimization, lazy loading, code splitting
- **Design**: Color contrast, dark mode, typography consistency

## Installation

```bash
npm install
```

## Usage

```bash
# Build the project
npm run build

# Run tests
npm test

# Run audit on a directory
npm run audit -- /path/to/components
```

## Project Structure

```
ui-audit/
├── src/
│   ├── scanner/          # Component discovery and parsing
│   ├── analyzer/         # Analysis engine and violation detection
│   ├── rules/            # Guideline rule implementations
│   ├── reporter/         # Report generation
│   ├── planner/          # Remediation plan generation
│   ├── utils/            # Error handling and utilities
│   └── types/            # TypeScript type definitions
├── tests/
│   ├── unit/             # Unit tests
│   ├── property/         # Property-based tests
│   └── integration/      # Integration tests
└── dist/                 # Compiled output
```

## Development

This project uses:
- **TypeScript** for type safety
- **Jest** for unit testing
- **fast-check** for property-based testing
- **@babel/parser** for AST parsing

## Testing

The project uses a dual testing approach:
- **Unit tests**: Verify specific examples and edge cases
- **Property tests**: Verify universal properties across many inputs

Run tests with:
```bash
npm test
```

## License

MIT
