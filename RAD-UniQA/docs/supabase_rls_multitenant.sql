-- ============================================================================
-- Eduniti AI: Multi-Tenant Data Isolation & Row Level Security (RLS)
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql/new
-- ============================================================================

-- 1. Table: vault_metadata
CREATE TABLE IF NOT EXISTS vault_metadata (
    filename TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_global BOOLEAN DEFAULT FALSE,
    pinned BOOLEAN DEFAULT FALSE,
    uploaded_at TEXT,
    subject TEXT DEFAULT 'General',
    module TEXT DEFAULT 'Module 1',
    size_bytes BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Ensure columns exist if table was already created
ALTER TABLE vault_metadata ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE vault_metadata ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT FALSE;

-- Enable Row Level Security
ALTER TABLE vault_metadata ENABLE ROW LEVEL SECURITY;

-- Select Policy: Users can view their own documents OR platform global documents
DROP POLICY IF EXISTS "Users can view own or global vault_metadata" ON vault_metadata;
CREATE POLICY "Users can view own or global vault_metadata"
    ON vault_metadata FOR SELECT
    TO authenticated, anon
    USING (auth.uid() = user_id OR is_global = true);

-- Insert Policy: Users can insert their own documents
DROP POLICY IF EXISTS "Users can insert own vault_metadata" ON vault_metadata;
CREATE POLICY "Users can insert own vault_metadata"
    ON vault_metadata FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Update Policy: Users can only update their own documents
DROP POLICY IF EXISTS "Users can update own vault_metadata" ON vault_metadata;
CREATE POLICY "Users can update own vault_metadata"
    ON vault_metadata FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

-- Delete Policy: Users can only delete their own documents
DROP POLICY IF EXISTS "Users can delete own vault_metadata" ON vault_metadata;
CREATE POLICY "Users can delete own vault_metadata"
    ON vault_metadata FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);


-- 2. Table: question_bank
CREATE TABLE IF NOT EXISTS question_bank (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    marks INTEGER DEFAULT 5,
    subject TEXT DEFAULT 'General',
    module TEXT DEFAULT 'Module 1',
    topic TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE question_bank ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own question_bank" ON question_bank;
CREATE POLICY "Users can manage own question_bank"
    ON question_bank FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- 3. Table: exam_history
CREATE TABLE IF NOT EXISTS exam_history (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    marks INTEGER DEFAULT 5,
    subject TEXT,
    module TEXT,
    answer TEXT,
    sources JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE exam_history ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE exam_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own exam_history" ON exam_history;
CREATE POLICY "Users can manage own exam_history"
    ON exam_history FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
