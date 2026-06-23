-- ============================================================
-- CorroSense – Supabase Storage Setup
-- Run in Supabase SQL Editor after schema migrations
-- ============================================================

-- Create private storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
(
    'raw-inspections',
    'raw-inspections',
    false,
    104857600,   -- 100 MB
    ARRAY['text/csv', 'application/json', 'application/zip', 'text/plain', 'application/octet-stream']
),
(
    'processed-artifacts',
    'processed-artifacts',
    false,
    52428800,    -- 50 MB
    ARRAY['application/json', 'text/csv']
),
(
    'report-exports',
    'report-exports',
    false,
    52428800,    -- 50 MB
    ARRAY['text/csv', 'application/json', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Storage RLS Policies
-- ============================================================

-- raw-inspections: authenticated org members can upload/download
CREATE POLICY "Org members can upload raw inspections"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'raw-inspections'
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Org members can read raw inspections"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'raw-inspections'
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Org members can delete own raw inspections"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'raw-inspections'
        AND auth.uid() = owner
    );

-- processed-artifacts: service role writes, members read
CREATE POLICY "Members can read processed artifacts"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'processed-artifacts'
        AND auth.role() = 'authenticated'
    );

-- report-exports: members can read/delete their own exports
CREATE POLICY "Members can access report exports"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'report-exports'
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Members can delete own report exports"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'report-exports'
        AND auth.uid() = owner
    );

-- ============================================================
-- Path convention (enforced by application, not SQL):
-- {organization_id}/{project_id}/{run_id}/{filename}
-- Example:
-- a1b2c3d4-e5f6.../b2c3d4e5.../f6a7b8c9.../gk3_mfl_run.csv
-- ============================================================
