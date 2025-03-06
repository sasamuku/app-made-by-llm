# Supabase Types

This directory contains TypeScript type definitions generated from the Supabase database schema.

## Generated Types

The `supabase.ts` file in this directory is automatically generated using the `npm run supabase:types` command, which runs:

```bash
supabase gen types typescript --local > app/types/supabase.ts
```

This command generates TypeScript types based on your local Supabase database schema.

## Usage

Import these types in your application to ensure type safety when working with Supabase data:

```typescript
import type { Database } from '@/app/types/supabase';

// Example usage with supabase client
const { data, error } = await supabase
  .from<Database['public']['Tables']['your_table']['Row']>('your_table')
  .select('*');
```

## Updating Types

When you make changes to your database schema, run the following command to update the type definitions:

```bash
npm run supabase:types
```
