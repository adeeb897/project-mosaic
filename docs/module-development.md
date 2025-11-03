# Project Mosaic Module Development Guide

This guide provides information on how to develop modules for the Project Mosaic platform.

## Development Environment Setup

Before developing modules, ensure you have the Project Mosaic development environment running:

```bash
npm run dev
```

This starts both the frontend and backend with hot reloading, allowing you to test your modules in real-time. For detailed setup instructions, see the [Development Setup Guide](./development-setup.md).

### Module Development Workflow

1. Start the development environment: `npm run dev`
2. Create your module in the appropriate directory
3. Register your module with the system
4. Test your module through the web interface
5. Run automated tests: `npm run test:unit`
6. Debug using browser DevTools or Node.js debugger

## Module Types

Project Mosaic supports several types of modules:

1. **Personality Modules**: Define AI personality traits and behaviors
2. **Tool Modules**: Add capabilities and tools to AI assistants
3. **Agent Modules**: Connect with external AI agents
4. **Modality Modules**: Handle different input/output modalities

## Module Structure

Each module should follow this basic structure:

```
src/modules/<module-type>/<module-name>/
├── index.ts                 # Main entry point
├── <module-name>.module.ts  # Module implementation
├── <module-name>.config.ts  # Configuration schema
├── <module-name>.test.ts    # Tests
└── README.md                # Module documentation
```

## Module Implementation

### Common Module Interface

All modules must implement the `IModule` interface:

```typescript
interface IModule {
  // Core Module Properties
  id: string;
  type: ModuleType;
  version: string;

  // Lifecycle Methods
  initialize(context: ModuleContext): Promise<void>;
  activate(): Promise<void>;
  deactivate(): Promise<void>;
  update(newVersion: string): Promise<void>;
  uninstall(): Promise<void>;

  // Configuration
  getConfigSchema(): JSONSchema7;
  getConfig(): ModuleConfig;
  updateConfig(config: Partial<ModuleConfig>): Promise<ModuleConfig>;
  validateConfig(config: ModuleConfig): Promise<ValidationResult>;

  // Event Handling
  handleEvent(event: ModuleEvent): Promise<void>;

  // Capability Methods
  getCapabilities(): ModuleCapability[];
  hasCapability(capability: string): boolean;
}
```

### Personality Module

Personality modules must implement the `IPersonalityModule` interface:

```typescript
interface IPersonalityModule extends IModule {
  // Core Personality Methods
  getSystemPrompt(): string | SystemPromptComponents;
  getPersonaAttributes(): PersonalityAttributes;

  // Message Processing
  processUserMessage(message: UserMessage): Promise<ProcessedMessage>;
  augmentAIResponse(response: AIResponse): Promise<AugmentedResponse>;

  // Context Management
  getContextAdditions(): ContextAddition[];
  processConversationContext(context: ConversationContext): Promise<ModifiedContext>;

  // Behavior Controls
  getResponseGuidelines(): ResponseGuidelines;
  getEthicalBoundaries(): EthicalBoundaries;
}
```

### Tool Module

Tool modules must implement the `IToolModule` interface:

```typescript
interface IToolModule extends IModule {
  // Tool Definition
  getToolDefinition(): ToolDefinition;

  // Execution
  validateParameters(params: Record<string, any>): Promise<ValidationResult>;
  execute(params: Record<string, any>, context: ExecutionContext): Promise<ToolResult>;

  // MCP Integration
  getMCPDefinition(): MCPToolDefinition;
  handleMCPRequest(request: MCPRequest): Promise<MCPResponse>;

  // UI Components
  getUIComponents(): ToolUIComponents;
  getRenderOptions(): ToolRenderOptions;
}
```

### Agent Module

Agent modules must implement the `IAgentModule` interface:

```typescript
interface IAgentModule extends IModule {
  // Agent Definition
  getAgentDefinition(): AgentDefinition;

  // Communication
  connect(): Promise<ConnectionResult>;
  disconnect(): Promise<void>;

  // Task Management
  createTask(task: AgentTask): Promise<Task>;
  getTaskStatus(taskId: string): Promise<TaskStatus>;
  cancelTask(taskId: string): Promise<boolean>;

  // A2A Integration
  getA2ACard(): A2AAgentCard;
  handleA2AMessage(message: A2AMessage): Promise<A2AResponse>;

  // Capability Management
  discoverCapabilities(): Promise<AgentCapability[]>;
  invokeCapability(capabilityId: string, params: any): Promise<CapabilityResult>;
}
```

### Modality Module

Modality modules must implement the `IModalityModule` interface:

```typescript
interface IModalityModule extends IModule {
  // Modality Definition
  getModalityDefinition(): ModalityDefinition;

  // Input Processing
  processInput(input: ModalityInput): Promise<ProcessedInput>;
  validateInput(input: ModalityInput): Promise<ValidationResult>;

  // Output Generation
  generateOutput(content: OutputContent, options: OutputOptions): Promise<ModalityOutput>;

  // Translation
  translateToModality(input: any, targetModality: string): Promise<ModalityData>;
  translateFromModality(modalityData: ModalityData): Promise<any>;

  // Capability Detection
  detectDeviceCapabilities(): Promise<DeviceCapabilities>;
  checkCompatibility(capabilities: DeviceCapabilities): Promise<CompatibilityResult>;
}
```

## Module Configuration

Each module should define a configuration schema using JSON Schema:

```typescript
const configSchema: JSONSchema7 = {
  type: 'object',
  properties: {
    // Define your module's configuration properties here
    name: {
      type: 'string',
      description: 'The name of the module',
    },
    // Add more properties as needed
  },
  required: ['name'],
};
```

## Module Registration

Modules are registered with the ModuleRegistry:

```typescript
// Example module registration
const myModule = new MyModule();
moduleRegistry.registerModule(myModule);
```

## Testing Modules

Each module should include comprehensive tests:

```typescript
// Example test for a module
describe('MyModule', () => {
  let module: MyModule;

  beforeEach(() => {
    module = new MyModule();
  });

  it('should initialize correctly', async () => {
    await module.initialize({} as ModuleContext);
    expect(module.getConfig()).toBeDefined();
  });

  // Add more tests as needed
});
```

## Publishing Modules

To publish a module to the Project Mosaic marketplace:

1. Ensure your module passes all tests
2. Update the module version
3. Create a module package
4. Submit the package to the marketplace

## Best Practices

1. **Separation of Concerns**: Keep your module focused on a single responsibility
2. **Error Handling**: Implement robust error handling
3. **Documentation**: Provide comprehensive documentation
4. **Testing**: Include thorough tests
5. **Configuration**: Make your module configurable
6. **Performance**: Optimize for performance
7. **Security**: Follow security best practices

## Examples

Check out the example modules in the `examples/modules` directory for reference implementations.

## Resources

- [Project Mosaic API Documentation](docs/api.md)
- [Module Configuration Guide](docs/module-configuration.md)
- [Module Testing Guide](docs/module-testing.md)
