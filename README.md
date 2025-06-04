# Project Mosaic

A modular platform with extensible architecture for building, configuring, and deploying AI assistants with customizable personalities, tools, and capabilities.

## Architecture

Project Mosaic is built with a modular architecture that allows for easy extension and customization. The main components are:

- **Client Application Layer**: React-based frontend for user interaction
- **API Gateway Layer**: Express-based API gateway for handling requests
- **Service Layer**: Core business logic services
- **Module & Integration Framework**: Framework for managing modules and integrations
- **External Integration Layer**: Connectors for external services and APIs
- **Persistence Layer**: Database and storage services

For more details, see the [detailed architecture document](modularai-detailed-architecture.md).

## Features

- **Modular Design**: Easily extend and customize the platform with modules
- **Personality Modules**: Create and configure AI personalities
- **Tool Modules**: Add tools and capabilities to your AI assistants
- **Agent Modules**: Connect with external AI agents
- **Protocol Support**: Support for MCP (Model Context Protocol) and A2A (Agent-to-Agent) protocols
- **Multi-Modal Support**: Handle text, voice, image, and other modalities
- **Profile System**: Create and manage AI assistant profiles
- **Event System**: Flexible event-based architecture

## Prerequisites

- Node.js 18+
- MongoDB 6+
- Redis 7+
- Docker and Docker Compose (optional, for containerized setup)

## Getting Started

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-organization/project-mosaic.git
   cd project-mosaic
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

### Development

Start both frontend and backend development servers with hot reloading:

```bash
npm run dev
```

This will:
- Start the React frontend with esbuild (fast builds ~50-100ms)
- Start the Express backend with nodemon (auto-restart)
- Serve the application at http://localhost:3000

#### Development Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both frontend and backend in development mode |
| `npm run dev:setup` | Automated setup with dependency installation |
| `npm run dev:server` | Start only the backend server |
| `npm run dev:client` | Start only the frontend build process |
| `npm run dev:debug` | Start backend with debugging enabled |

#### Alternative: Docker Compose

```bash
docker-compose up
```

For detailed development setup instructions, see the [Development Setup Guide](docs/development-setup.md).

#### Authentication Bypass for Development

For easier development and testing, authentication can be bypassed in development mode:

```bash
# Set in .env.development (already configured)
BYPASS_AUTH_IN_DEV=true
```

When enabled, all protected API endpoints will work without authentication headers. See the [Development Setup Guide](docs/development-setup.md#authentication-bypass-for-development) for more details.

### Building

Build the project:

```bash
npm run build
```

### Testing

Run tests:

```bash
npm test
```

### Production

Start the production server:

```bash
npm start
```

Or using Docker:

```bash
docker build -t project-mosaic .
docker run -p 3000:3000 project-mosaic
```

## Project Structure

```
project-mosaic/
├── config/             # Configuration files
├── docs/               # Documentation
├── scripts/            # Utility scripts
├── src/                # Source code
│   ├── api/            # API gateway and routes
│   ├── client/         # Frontend client application
│   ├── framework/      # Core framework components
│   ├── integrations/   # External integrations
│   ├── persistence/    # Database and storage
│   ├── services/       # Business logic services
│   └── utils/          # Utility functions
└── tests/              # Test files
```

## Module Development

Project Mosaic supports several types of modules:

- **Personality Modules**: Define AI personality traits and behaviors
- **Tool Modules**: Add capabilities and tools to AI assistants
- **Agent Modules**: Connect with external AI agents
- **Modality Modules**: Handle different input/output modalities

For more information on developing modules, see the [Module Development Guide](docs/module-development.md).

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

This project is licensed under the GNU GPL-3.0 LICENSE - see the [LICENSE](LICENSE) file for details.
