-- Add soft-delete column to splits table.
-- Recent Splits filters this out; Spending keeps deleted splits in totals.
ALTER TABLE splits ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;

-- Index for efficient filtering of active splits
CREATE INDEX IF NOT EXISTS idx_splits_is_deleted ON splits (is_deleted) WHERE is_deleted = false;
