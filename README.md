# Project Mosaic

## Overview

Project Mosaic is an innovative AI chat/agent interface designed for the average user, focusing on accessibility, customization, and community sharing. The platform implements a modular architecture that supports various types of extensions including personality modules, tool integrations via MCP (Model Context Protocol), and A2A (Agent-to-Agent) communication capabilities.

This project aims to create an intuitive, accessible AI interface that empowers everyday users to customize their AI assistant experience through modules, while fostering a community where users can share and discover new functionalities. Project Mosaic prioritizes future-proofing to accommodate the rapidly evolving AI landscape, supporting multiple modalities and emerging protocols.

## Key Features

- **Intuitive User Interface**: Simple, approachable design for users of all technical abilities
- **Modular Framework**: Support for various types of modules that extend functionality
  - Personality Modules: Define AI behavior, tone, expertise areas
  - Tool Modules: Add capabilities like web search, calculators, etc.
  - Agent Modules: Connect to specialized agents for specific tasks
  - Theme Modules: Customize UI appearance
- **Module Marketplace**: Community platform for sharing and discovering modules
- **Interoperability**: Support for industry-standard protocols (MCP, A2A, Agent File Format)
- **User-Created Content**: Tools for users to create, test, and publish their own modules
- **Profile System**: Ability to save and switch between different AI configurations
- **Security & Privacy**: Robust system for vetting modules and protecting user data
- **Multimodal Support**: Flexible framework for different input and output modalities
- **Future-Proof Design**: Abstraction layers and extensible architecture to adapt to evolving technologies

## System Architecture

ModularAI follows a modular, layered architecture:

```
┌───────────────────────────────────────────────────────────────┐
│                       User Interface Layer                     │
└───────────────────────────────────────┬───────────────────────┘
                                       │
┌───────────────────────────────────────┴───────────────────────┐
│                     Application Core Layer                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │ User Mgmt   │  │ Module Mgmt │  │ Config/Profile Mgmt │   │
│  └─────────────┘  └─────────────┘  └─────────────────────┘   │
└───────────────────────────────────────────┬───────────────────┘
                                           │
┌───────────────────────────────────────────┴───────────────────┐
│                        Module Layer                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────┐  │
│  │ Personality │  │    Tools    │  │   Agents    │  │ ...  │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └──────┘  │
└───────────────────────────────────────────┬───────────────────┘
                                           │
┌───────────────────────────────────────────┴───────────────────┐
│                     Integration Layer                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │ MCP Adapter │  │ A2A Adapter │  │ Agent File Adapter  │   │
│  └─────────────┘  └─────────────┘  └─────────────────────┘   │
└───────────────────────────────────────────┬───────────────────┘
                                           │
┌───────────────────────────────────────────┴───────────────────┐
│                    External Systems                            │
│  LLMs, Knowledge Bases, APIs, Other Agents, Services, etc.     │
└───────────────────────────────────────────────────────────────┘
```

## Project Structure

```
project-mosaic/
├── client/                  # Frontend application
│   ├── public/              # Static assets
│   ├── src/                 # Application source code
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── store/           # Redux state management
│   │   ├── services/        # API and service integration
│   │   ├── modalities/      # Input/output modality handlers
│   │   └── utils/           # Utility functions
│   └── tests/               # Frontend tests
├── server/                  # Backend application
│   ├── src/                 # Server source code
│   │   ├── api/             # API endpoints
│   │   ├── controllers/     # Request handlers
│   │   ├── models/          # Data models
│   │   ├── services/        # Business logic
│   │   ├── integration/     # External service integration
│   │   ├── modules/         # Module management
│   │   └── utils/           # Utility functions
│   └── tests/               # Backend tests
├── core/                    # Shared core functionality
│   ├── module-framework/    # Module system core
│   ├── protocols/           # Protocol implementations
│   └── schema/              # Shared data schemas
├── docs/                    # Documentation
│   ├── architecture/        # Architecture documentation
│   ├── modules/             # Module development guides
│   └── protocols/           # Protocol specifications
├── examples/                # Example modules and integrations
│   ├── personality-modules/ # Example personality modules
│   ├── tool-modules/        # Example tool modules
│   └── agent-modules/       # Example agent modules
└── scripts/                 # Development and deployment scripts
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (v5 or higher)
- Redis (v6 or higher)
- Docker (for containerized deployment)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-organization/project-mosaic.git
   cd project-mosaic
   ```

2. Install dependencies:
   ```bash
   # Install server dependencies
   cd server
   npm install

   # Install client dependencies
   cd ../client
   npm install
   ```

3. Set up environment variables:
   ```bash
   # In server directory
   cp .env.example .env
   # Edit .env file with your configuration
   ```

4. Start development servers:
   ```bash
   # Start server (from server directory)
   npm run dev

   # Start client (from client directory)
   npm run dev
   ```

5. Access the application at `http://localhost:3000`

### Development Workflow

1. Use feature branches with the format `feature/[feature-name]`
2. Write tests for new functionality
3. Ensure linting and formatting pass with `npm run lint`

## Module Development

ModularAI supports various types of modules to extend functionality. Each module follows a standardized structure:

```
module/
  ├── manifest.json      # Module metadata and dependencies
  ├── schema.json        # Property schema definition with versioning
  ├── config.json        # Default configuration values
  ├── migrations/        # Configuration schema migrations
  │   └── v1-to-v2.js    # Migration scripts between versions
  ├── assets/            # Module-specific assets
  │   ├── icons/
  │   └── media/
  ├── code/              # Implementation code (if applicable)
  │   ├── main.js        # Main module logic
  │   ├── modalities/    # Modality-specific handlers
  │   └── ui/            # Custom UI components
  ├── tests/             # Test suite for the module
  │   ├── unit/
  │   └── integration/
  └── docs/              # Documentation
      ├── README.md      # Module documentation
      └── examples/      # Usage examples
```

For detailed module development instructions, see the Module Development Guide (to be developed).

## Protocol Integration

ModularAI integrates with several protocols to enable interoperability with external systems:

### Model Context Protocol (MCP)

MCP enables the platform to connect AI models with external tools and data sources.

### Agent-to-Agent (A2A) Protocol

A2A enables communication between Project Mosaic and other agent systems.

### Agent File (.af) Format

The platform supports the Agent File format for agent serialization and sharing.

## Project Roadmap

The project is organized into the following phases:

1. **Foundation (Months 1-2)**: Core infrastructure, basic application framework, and essential services
2. **Module System (Months 3-4)**: Module framework, personality modules, and tool modules
3. **Integration & Expansion (Months 5-6)**: Protocol adapters, agent modules, and modality support
4. **Advanced Features (Months 7-8)**: Enhanced module capabilities, advanced modalities, and marketplace features
5. **Polish & Launch (Months 9-10)**: Quality improvements, documentation, and production deployment
6. **Future-Proofing & Evolution (Ongoing)**: Extensibility framework, feature flags, and migration tools

For detailed information about project implementation, see Project Action Plan and Project Tasks documents.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
