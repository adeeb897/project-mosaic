# Project Mosaic: Database Schema and Migration System

This directory contains the database schema and migration system for Project Mosaic.

## Database Schema

The database schema is defined using Mongoose, a MongoDB object modeling tool. The schema is organized into the following collections:

### Users

The `users` collection stores user information, including:

- Authentication details (username, email, password hash)
- User preferences
- Roles and permissions
- Account status

**Indexes:**

- `username`: Unique index for username lookups
- `email`: Unique index for email lookups
- `status`: Index for filtering users by status
- `roles.name`: Index for role-based queries
- `createdAt`, `updatedAt`: Indexes for timestamp-based queries

### Modules

The `modules` collection stores module information, including:

- Module metadata (name, description, version)
- Module type (personality, tool, agent, theme, modality)
- Author information
- Review status
- Compatibility information
- Installation statistics

**Indexes:**

- `name`: Index for name-based lookups
- `author.id`: Index for author-based queries
- `type`: Index for filtering by module type
- `metadata.tags`: Index for tag-based queries
- `reviewStatus`: Index for filtering by review status
- `installCount`, `rating`: Indexes for sorting by popularity
- `createdAt`, `publishedAt`: Indexes for timestamp-based queries
- Text index on `name` and `description` for full-text search
- Compound indexes for common query patterns

### Conversations

The `conversations` collection stores conversation information, including:

- Conversation metadata (title, status)
- User association
- Context information
- Active modules
- Profile association

**Indexes:**

- `userId`: Index for user-based queries
- `status`: Index for filtering by status
- `profile`: Index for profile-based queries
- `lastMessageAt`: Index for sorting by recency
- `folderPath`: Index for folder-based organization
- `sharedWith`: Index for shared conversation queries
- Text index on `title` for full-text search
- Compound indexes for common query patterns

### Messages

The `messages` collection stores message information, including:

- Message content (text, images, etc.)
- Role (user, assistant, system)
- Conversation association
- Metadata (source modules, processing time, etc.)

**Indexes:**

- `conversationId`: Index for conversation-based queries
- `role`: Index for filtering by role
- `createdAt`: Index for sorting by timestamp
- `metadata.sourceModules`: Index for source module queries
- `content.type`: Index for content type queries
- Compound index on `conversationId` and `createdAt` for efficient message retrieval

### Profiles

The `profiles` collection stores profile information, including:

- Profile metadata (name, description)
- User association
- Module references
- Default modality
- Sharing settings

**Indexes:**

- `userId`: Index for user-based queries
- `isDefault`: Index for default profile queries
- `shareCode`: Unique index for share code lookups
- `isPublic`: Index for public profile queries
- `tags`: Index for tag-based queries
- `clonedFrom`: Index for clone tracking
- Text index on `name`, `description`, and `tags` for full-text search
- Compound indexes for common query patterns

## Migration System

The migration system allows for versioned database schema changes. Migrations are defined in the `migrations` directory and are applied in order based on their version number.

### Migration Structure

Each migration has the following structure:

```typescript
export const SomeMigration: IMigration = {
  version: 1,
  name: 'migration-name',
  description: 'Migration description',

  async up(): Promise<void> {
    // Apply the migration
  },

  async down(): Promise<void> {
    // Rollback the migration
  },
};
```

### Running Migrations

Migrations can be run using the `run-migrations.ts` script:

```bash
npx ts-node src/persistence/migrations/run-migrations.ts
```

### Adding a New Migration

To add a new migration:

1. Create a new file in the `migrations` directory with a name like `XXX-migration-name.ts`
2. Define the migration using the `IMigration` interface
3. Register the migration in `run-migrations.ts`

## Repository Pattern

The database access layer follows the repository pattern, which provides a clean API for interacting with the database. Each model has a corresponding repository that handles database operations.

### Base Repository

The `BaseRepository` class provides common functionality for all repositories, including:

- CRUD operations
- Pagination
- Filtering
- Sorting

### Model-Specific Repositories

Each model has a specific repository that extends the base repository and adds model-specific functionality:

- `UserRepository`: User-specific operations
- `ModuleRepository`: Module-specific operations
- `ConversationRepository`: Conversation-specific operations
- `MessageRepository`: Message-specific operations
- `ProfileRepository`: Profile-specific operations

## Sample Data

The `scripts` directory contains scripts for initializing the database with sample data. This is useful for development and testing purposes.

To initialize the database with sample data:

```bash
npx ts-node src/persistence/scripts/init-sample-data.ts
```
