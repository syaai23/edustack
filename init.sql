-- Initialize database with extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create initial indexes for better performance
-- These will be created by Prisma as well, but having them here ensures they exist
