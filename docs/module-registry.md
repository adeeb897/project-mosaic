# Module Registry

The Module Registry is a central component of Project Mosaic that manages the registration, discovery, and metadata management of all module types in the system. It provides APIs for module registration, version tracking, dependency resolution, and conflict detection.

## Features

- **Module Registration**: Register new modules with metadata, versioning, and dependency information
- **Module Discovery**: Search and retrieve modules based on various criteria
- **Version Management**: Track multiple versions of modules, including deprecation and yanking
- **Dependency Resolution**: Resolve module dependencies and detect conflicts
- **Installation Tracking**: Track module installations per user
- **Metadata Management**: Update module metadata, tags, and other properties

## Module Types

The registry supports various module types:

- **Personality**: Modules that define AI personality traits and behaviors
- **Tool**: Modules that provide specific functionality or capabilities
- **Agent**: Modules that connect to external agents or services
- **Theme**: Modules that define UI themes and styling
- **Modality**: Modules that handle different input/output modalities

## API Reference

### Module Registration

```typescript
// Register a new module
POST /api/modules/register
{
  "name": "Example Module",
  "description": "An example module",
  "version": "1.0.0",
  "type": "tool",
  "author": {
    "id": "author-123",
    "name": "John Doe"
  },
  "metadata": {
    "schemaVersion": "1.0",
    "license": "MIT",
    "tags": ["example", "tool"],
    "dependencies": [],
    "permissions": [],
    "capabilities": [],
    "compatibility": {
      "minPlatformVersion": "1.0.0",
      "targetPlatformVersion": "1.0.0",
      "supportedProtocols": [],
      "supportedModalities": []
    }
  }
}
```

### Module Updates

```typescript
// Update module information
PUT /api/modules/:moduleId
{
  "description": "Updated description",
  "status": "active",
  "reviewStatus": "approved"
}

// Publish a new version
POST /api/modules/:moduleId/versions
{
  "version": "1.1.0",
  "description": "New version with improvements",
  "metadata": {
    // Updated metadata
  }
}
```

### Module Discovery

```typescript
// Search for modules
GET /api/modules/search?type=tool&status=active&author=author-123&tags=example,tool&minRating=4&searchText=example&includeDeprecated=false

// Get module by ID
GET /api/modules/:moduleId

// Get all versions of a module
GET /api/modules/:moduleId/versions

// Get latest version of a module
GET /api/modules/:moduleId/versions/latest
```

### Installation Management

```typescript
// Record module installation
POST /api/modules/:moduleId/install
{
  "version": "1.0.0"
}

// Get user's module installations
GET /api/modules/installations

// Update module installation
PUT /api/modules/:moduleId/installation
{
  "enabled": true,
  "config": {
    // Module-specific configuration
  },
  "profileIds": ["profile-123"]
}
```

### Dependency Management

```typescript
// Resolve module dependencies
GET /api/modules/:moduleId/dependencies?version=1.0.0

// Check for conflicts with installed modules
POST /api/modules/:moduleId/check-conflicts
```

### Version Management

```typescript
// Deprecate a module version
POST /api/modules/:moduleId/versions/:version/deprecate
{
  "reason": "Security vulnerability found"
}

// Yank a module version
POST /api/modules/:moduleId/versions/:version/yank
{
  "reason": "Critical bug found"
}
```

### Metadata Management

```typescript
// Update module metadata
PATCH /api/modules/:moduleId/metadata
{
  "tags": ["updated", "tags"],
  "permissions": ["updated", "permissions"],
  "capabilities": [
    {
      "id": "capability-123",
      "version": "1.0.0",
      "optional": false
    }
  ]
}

// Add tags to module
POST /api/modules/:moduleId/tags
{
  "tags": ["new", "tags"]
}

// Remove tags from module
DELETE /api/modules/:moduleId/tags
{
  "tags": ["old", "tags"]
}

// Rate a module
POST /api/modules/:moduleId/rate
{
  "rating": 4.5
}
```

## Data Models

### Module

```typescript
interface Module {
  id: string;
  name: string;
  description: string;
  version: string;
  type: ModuleType;
  author: {
    id: string;
    name: string;
    website?: string;
    email?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  requiresReview: boolean;
  reviewStatus: ReviewStatus;
  status: ModuleStatus;
  metadata: ModuleMetadata;
  checksum?: string;
  downloadUrl?: string;
  installCount: number;
  rating: number;
  ratingCount: number;
}
```

### Module Version

```typescript
interface ModuleVersion {
  id: string;
  moduleId: string;
  version: string;
  releaseNotes?: string;
  createdAt: Date;
  metadata: ModuleMetadata;
  checksum: string;
  downloadUrl: string;
  deprecated: boolean;
  yanked: boolean;
}
```

### Module Installation

```typescript
interface ModuleInstallation {
  id: string;
  userId: string;
  moduleId: string;
  version: string;
  installedAt: Date;
  updatedAt: Date;
  enabled: boolean;
  config: Record<string, any>;
  profileIds: string[];
}
```

### Module Metadata

```typescript
interface ModuleMetadata {
  schemaVersion: string;
  license: string;
  tags: string[];
  dependencies: Array<{
    id: string;
    version: string;
    optional: boolean;
  }>;
  permissions: string[];
  capabilities: Array<{
    id: string;
    version: string;
    optional: boolean;
  }>;
  compatibility: {
    minPlatformVersion: string;
    targetPlatformVersion: string;
    supportedProtocols: Array<{
      name: string;
      version: string;
    }>;
    supportedModalities: string[];
  };
  uiComponents?: Array<{
    id: string;
    type: string;
    location: string;
    component: string;
    props?: Record<string, any>;
  }>;
}
```

## Usage Examples

### Registering a Module

```typescript
import axios from 'axios';

async function registerModule() {
  const moduleData = {
    name: 'Weather Tool',
    description: 'A tool for getting weather information',
    version: '1.0.0',
    type: 'tool',
    author: {
      id: 'author-123',
      name: 'John Doe'
    },
    metadata: {
      schemaVersion: '1.0',
      license: 'MIT',
      tags: ['weather', 'tool'],
      dependencies: [],
      permissions: ['internet'],
      capabilities: [
        {
          id: 'weather-lookup',
          version: '1.0.0',
          optional: false
        }
      ],
      compatibility: {
        minPlatformVersion: '1.0.0',
        targetPlatformVersion: '1.0.0',
        supportedProtocols: [
          {
            name: 'http',
            version: '1.1'
          }
        ],
        supportedModalities: ['text']
      }
    }
  };

  try {
    const response = await axios.post('/api/modules/register', moduleData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_TOKEN'
      }
    });

    console.log('Module registered:', response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to register module:', error);
    throw error;
  }
}
```

### Searching for Modules

```typescript
import axios from 'axios';

async function searchModules(filters) {
  try {
    const response = await axios.get('/api/modules/search', {
      params: filters,
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN'
      }
    });

    console.log('Modules found:', response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to search modules:', error);
    throw error;
  }
}

// Example usage
searchModules({
  type: 'tool',
  status: 'active',
  tags: 'weather,tool',
  searchText: 'weather'
});
```

### Installing a Module

```typescript
import axios from 'axios';

async function installModule(moduleId, version) {
  try {
    const response = await axios.post(`/api/modules/${moduleId}/install`, {
      version
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_TOKEN'
      }
    });

    console.log('Module installed:', response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to install module:', error);
    throw error;
  }
}

// Example usage
installModule('module-123', '1.0.0');
```

## Best Practices

1. **Versioning**: Follow semantic versioning (SemVer) for module versions
2. **Dependencies**: Specify dependencies with version constraints to ensure compatibility
3. **Metadata**: Provide comprehensive metadata to help users discover and understand your module
4. **Permissions**: Request only the permissions your module actually needs
5. **Documentation**: Include clear documentation about your module's functionality and usage
6. **Testing**: Test your module thoroughly before publishing
7. **Deprecation**: Use deprecation notices to inform users about future changes
8. **Yanking**: Only yank versions that have critical security or functionality issues

## Troubleshooting

### Common Issues

1. **Module Registration Fails**:
   - Ensure all required fields are provided
   - Check that the module name and version combination is unique
   - Verify that the version follows semantic versioning

2. **Dependency Resolution Fails**:
   - Check that all dependencies exist in the registry
   - Verify version compatibility between modules
   - Look for circular dependencies

3. **Installation Issues**:
   - Ensure the user has permission to install the module
   - Check for conflicts with already installed modules
   - Verify that the module is compatible with the platform version

4. **Version Management**:
   - Only administrators can deprecate or yank versions
   - Provide clear reasons when deprecating or yanking versions
   - Consider the impact on users before yanking a version
