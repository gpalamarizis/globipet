-- Migration: Add preferred_language to users table
ALTER TABLE users ADD COLUMN preferred_language VARCHAR(10) DEFAULT 'el';
