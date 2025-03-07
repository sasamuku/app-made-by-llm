# Supabase Commands

This document provides an overview of the Supabase-related npm scripts available in this project.

## Available Scripts

### Starting and Stopping Supabase

```bash
# Start all Supabase services locally
npm run supabase:start

# Stop all Supabase services
npm run supabase:stop

# Check the status of local Supabase services
npm run supabase:status

# Open the Supabase Studio in your browser
npm run supabase:studio
```

### Database Management

```bash
# Reset the local database (drops all data and reapplies migrations)
npm run supabase:db:reset

# Pull the remote database schema to local
npm run supabase:pull
```

### Migration Management

```bash
# Create a new migration file
npm run supabase:migration:new

# Apply pending migrations
npm run supabase:migration:up
```

### Type Generation

```bash
# Generate TypeScript types from the Supabase database schema
npm run supabase:types
```

### Development

```bash
# Start both Supabase and Next.js development server together
npm run dev:with-supabase
```

## Common Workflows

### Setting Up a New Development Environment

1. Start Supabase services:
   ```bash
   npm run supabase:start
   ```

2. Start the Next.js development server:
   ```bash
   npm run dev
   ```

   Alternatively, use the combined command:
   ```bash
   npm run dev:with-supabase
   ```

### Making Database Schema Changes

1. Create a new migration:
   ```bash
   npm run supabase:migration:new
   ```

2. Edit the generated migration file in the `supabase/migrations` directory

3. Apply the migration:
   ```bash
   npm run supabase:migration:up
   ```

4. Generate updated TypeScript types:
   ```bash
   npm run supabase:types
   ```

## Troubleshooting

If you encounter issues with the local Supabase instance:

1. Check the status:
   ```bash
   npm run supabase:status
   ```

2. Try stopping and restarting:
   ```bash
   npm run supabase:stop
   npm run supabase:start
   ```

3. If problems persist, reset the database:
   ```bash
   npm run supabase:db:reset
