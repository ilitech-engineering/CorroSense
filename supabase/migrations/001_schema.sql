-- ============================================================
-- CorroSense – Complete Database Schema
-- Version: 1.0.0
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'engineer', 'viewer');
CREATE TYPE member_status AS ENUM ('active', 'invited', 'suspended');
CREATE TYPE pipeline_material AS ENUM ('carbon_steel', 'stainless_steel', 'duplex_steel', 'hdpe', 'frp', 'other');
CREATE TYPE transported_fluid AS ENUM ('crude_oil', 'natural_gas', 'refined_product', 'water', 'multiphase', 'other');
CREATE TYPE tool_type AS ENUM ('MFL', 'UT', 'combo', 'EMAT', 'other');
CREATE TYPE run_status AS ENUM ('draft', 'files_uploaded', 'queued', 'processing', 'completed', 'failed', 'archived');
CREATE TYPE job_status AS ENUM ('queued', 'processing', 'completed', 'failed', 'cancelled');
CREATE TYPE file_processing_state AS ENUM ('pending', 'processing', 'processed', 'error');
CREATE TYPE severity_level AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE defect_type AS ENUM ('corrosion', 'metal_loss', 'anomaly', 'crack', 'dent', 'other');

-- ============================================================
-- PROFILES
-- ============================================================

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    title TEXT,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_email ON profiles(email);

-- ============================================================
-- ORGANIZATIONS
-- ============================================================

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    industry TEXT,
    country TEXT DEFAULT 'DZ',
    address TEXT,
    contact_email TEXT,
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_organizations_slug ON organizations(slug);

-- ============================================================
-- ORGANIZATION MEMBERS
-- ============================================================

CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'engineer',
    status member_status NOT NULL DEFAULT 'active',
    invited_by UUID REFERENCES profiles(id),
    joined_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);

-- ============================================================
-- PROJECTS
-- ============================================================

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT,
    location TEXT,
    start_date DATE,
    end_date DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold', 'cancelled')),
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, code)
);

CREATE INDEX idx_projects_org ON projects(organization_id);
CREATE INDEX idx_projects_status ON projects(status);

-- ============================================================
-- PIPELINES
-- ============================================================

CREATE TABLE pipelines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    location TEXT,
    total_length_m NUMERIC(12, 2),
    diameter_mm NUMERIC(8, 2),
    nominal_wall_thickness_mm NUMERIC(6, 3),
    material pipeline_material DEFAULT 'carbon_steel',
    transported_fluid transported_fluid DEFAULT 'crude_oil',
    nominal_pressure_bar NUMERIC(8, 2),
    max_allowable_pressure_bar NUMERIC(8, 2),
    design_temperature_c NUMERIC(6, 2),
    commissioned_at DATE,
    operator TEXT,
    manufacturer TEXT,
    coating_type TEXT,
    cathodic_protection BOOLEAN DEFAULT FALSE,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, code)
);

CREATE INDEX idx_pipelines_org ON pipelines(organization_id);
CREATE INDEX idx_pipelines_project ON pipelines(project_id);

-- ============================================================
-- INSPECTION RUNS
-- ============================================================

CREATE TABLE inspection_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    inspection_date DATE NOT NULL,
    tool_type tool_type NOT NULL DEFAULT 'MFL',
    tool_vendor TEXT,
    tool_version TEXT,
    inspected_length_m NUMERIC(12, 2),
    pull_speed_m_min NUMERIC(6, 3),
    operator_name TEXT,
    weather_conditions TEXT,
    comment TEXT,
    status run_status NOT NULL DEFAULT 'draft',
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_runs_org ON inspection_runs(organization_id);
CREATE INDEX idx_runs_project ON inspection_runs(project_id);
CREATE INDEX idx_runs_pipeline ON inspection_runs(pipeline_id);
CREATE INDEX idx_runs_status ON inspection_runs(status);
CREATE INDEX idx_runs_date ON inspection_runs(inspection_date DESC);

-- ============================================================
-- UPLOADED FILES
-- ============================================================

CREATE TABLE uploaded_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    run_id UUID NOT NULL REFERENCES inspection_runs(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_size_bytes BIGINT,
    mime_type TEXT,
    storage_path TEXT NOT NULL,
    storage_bucket TEXT NOT NULL DEFAULT 'raw-inspections',
    processing_state file_processing_state NOT NULL DEFAULT 'pending',
    checksum_md5 TEXT,
    row_count INTEGER,
    column_names JSONB,
    preview_data JSONB,
    error_message TEXT,
    uploaded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_files_run ON uploaded_files(run_id);
CREATE INDEX idx_files_org ON uploaded_files(organization_id);
CREATE INDEX idx_files_state ON uploaded_files(processing_state);

-- ============================================================
-- ANALYSIS JOBS
-- ============================================================

CREATE TABLE analysis_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    run_id UUID NOT NULL REFERENCES inspection_runs(id) ON DELETE CASCADE,
    status job_status NOT NULL DEFAULT 'queued',
    progress_pct INTEGER DEFAULT 0 CHECK (progress_pct >= 0 AND progress_pct <= 100),
    analyzer_version TEXT DEFAULT 'mock-v1',
    parameters JSONB DEFAULT '{}',
    error_message TEXT,
    defects_found INTEGER DEFAULT 0,
    segments_analyzed INTEGER DEFAULT 0,
    queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_jobs_run ON analysis_jobs(run_id);
CREATE INDEX idx_jobs_status ON analysis_jobs(status);
CREATE INDEX idx_jobs_org ON analysis_jobs(organization_id);

-- ============================================================
-- DEFECTS
-- ============================================================

CREATE TABLE defects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    run_id UUID NOT NULL REFERENCES inspection_runs(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
    pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    -- Location
    distance_from_start_m NUMERIC(12, 3) NOT NULL,
    clock_position TEXT,
    segment_label TEXT,
    -- Defect characteristics
    defect_type defect_type NOT NULL DEFAULT 'corrosion',
    length_mm NUMERIC(10, 3),
    width_mm NUMERIC(10, 3),
    depth_mm NUMERIC(10, 3),
    depth_percent NUMERIC(6, 3),
    -- Analysis outputs
    corrosion_probability NUMERIC(5, 4) CHECK (corrosion_probability >= 0 AND corrosion_probability <= 1),
    severity_level severity_level NOT NULL DEFAULT 'low',
    confidence_score NUMERIC(5, 4) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    risk_score NUMERIC(6, 2) CHECK (risk_score >= 0 AND risk_score <= 100),
    -- Raw signal data
    signal_strength NUMERIC(10, 4),
    anomaly_index NUMERIC(10, 4),
    wall_thickness_mm NUMERIC(8, 4),
    nominal_thickness_mm NUMERIC(8, 4),
    -- Notes
    notes TEXT,
    flagged_for_review BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_defects_run ON defects(run_id);
CREATE INDEX idx_defects_job ON defects(job_id);
CREATE INDEX idx_defects_pipeline ON defects(pipeline_id);
CREATE INDEX idx_defects_severity ON defects(severity_level);
CREATE INDEX idx_defects_risk ON defects(risk_score DESC);
CREATE INDEX idx_defects_distance ON defects(distance_from_start_m);
CREATE INDEX idx_defects_org ON defects(organization_id);

-- ============================================================
-- SEGMENT RISK SCORES
-- ============================================================

CREATE TABLE segment_risk_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    run_id UUID NOT NULL REFERENCES inspection_runs(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
    pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    -- Segment bounds
    segment_label TEXT NOT NULL,
    segment_start_m NUMERIC(12, 3) NOT NULL,
    segment_end_m NUMERIC(12, 3) NOT NULL,
    -- Aggregated metrics
    defect_count INTEGER NOT NULL DEFAULT 0,
    dominant_severity severity_level,
    max_depth_percent NUMERIC(6, 3),
    avg_depth_percent NUMERIC(6, 3),
    avg_corrosion_probability NUMERIC(5, 4),
    max_corrosion_probability NUMERIC(5, 4),
    aggregated_risk_score NUMERIC(6, 2),
    critical_defect_count INTEGER DEFAULT 0,
    high_defect_count INTEGER DEFAULT 0,
    -- Extra context
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_segments_run ON segment_risk_scores(run_id);
CREATE INDEX idx_segments_job ON segment_risk_scores(job_id);
CREATE INDEX idx_segments_risk ON segment_risk_scores(aggregated_risk_score DESC);

-- ============================================================
-- REPORTS
-- ============================================================

CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    run_id UUID REFERENCES inspection_runs(id) ON DELETE SET NULL,
    job_id UUID REFERENCES analysis_jobs(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    report_type TEXT NOT NULL DEFAULT 'analysis_summary',
    format TEXT NOT NULL DEFAULT 'csv' CHECK (format IN ('csv', 'json', 'pdf')),
    storage_path TEXT,
    storage_bucket TEXT DEFAULT 'report-exports',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'ready', 'failed')),
    file_size_bytes BIGINT,
    generated_by UUID REFERENCES profiles(id),
    generated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_org ON reports(organization_id);
CREATE INDEX idx_reports_run ON reports(run_id);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_org_members_updated_at BEFORE UPDATE ON organization_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pipelines_updated_at BEFORE UPDATE ON pipelines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_runs_updated_at BEFORE UPDATE ON inspection_runs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_files_updated_at BEFORE UPDATE ON uploaded_files FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON analysis_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function: get_user_organization_ids (for RLS)
CREATE OR REPLACE FUNCTION get_user_organization_ids()
RETURNS UUID[] AS $$
    SELECT ARRAY_AGG(organization_id)
    FROM organization_members
    WHERE user_id = auth.uid() AND status = 'active';
$$ LANGUAGE SQL SECURITY DEFINER STABLE;
