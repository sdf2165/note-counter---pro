/*
  # Remove Advertisement System

  1. Tables to Remove
    - `advertisements` table and all related data
    - `ad_inquiries` table and all related data

  2. Functions to Remove
    - `update_ad_end_time` trigger function

  3. Clean Up
    - Remove all advertisement-related database objects
    - Clean up any orphaned data
*/

-- Drop tables if they exist
DROP TABLE IF EXISTS advertisements CASCADE;
DROP TABLE IF EXISTS ad_inquiries CASCADE;

-- Drop trigger functions if they exist
DROP FUNCTION IF EXISTS update_ad_end_time() CASCADE;