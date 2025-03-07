# Prisma Migrations

In addition to Supabase migrations, this application uses Prisma to manage more advanced schema changes. Follow these steps when modifying schemas via Prisma:

1. Ensure the DATABASE_URL environment variable is set in .env.local (e.g. `DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"`).
2. Run `npx prisma migrate dev` to create and apply your migration locally.
3. Verify that the newly created migration files are in the prisma/migrations directory.
4. Commit and push your migration files to version control. This ensures that the schema is consistent across all environments.
