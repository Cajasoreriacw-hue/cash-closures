-- Row Level Security (RLS) Policies for Expenses Table
-- Execute this after creating the expenses table

-- Enable RLS on expenses table
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to view all expenses
CREATE POLICY "Users can view expenses"
  ON expenses
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Allow authenticated users to insert expenses
CREATE POLICY "Users can insert expenses"
  ON expenses
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy: Allow authenticated users to update expenses
CREATE POLICY "Users can update expenses"
  ON expenses
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- NOTE: DELETE policy is intentionally NOT included
-- Users cannot delete expense records to maintain data integrity

-- If you want to restrict by user/organization, you can modify the policies
-- For example, to restrict by user_id (if you add a user_id column):
-- 
-- ALTER TABLE expenses ADD COLUMN user_id UUID REFERENCES auth.users(id);
-- 
-- CREATE POLICY "Users can view their own expenses"
--   ON expenses
--   FOR SELECT
--   USING (auth.uid() = user_id);
