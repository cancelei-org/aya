-- Production database migration fix
-- This script adds the missing is_admin column to the users table

-- Add is_admin column if it doesn't exist
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_admin" BOOLEAN NOT NULL DEFAULT false;

-- Add last_active_at column if it doesn't exist  
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_active_at" TIMESTAMP(3);

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users' 
  AND column_name IN ('is_admin', 'last_active_at');