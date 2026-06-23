-- ============================================================
-- CorroSense – Row Level Security Policies
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE defects ENABLE ROW LEVEL SECURITY;
ALTER TABLE segment_risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES
-- ============================================================

CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Members can view profiles in same org"
    ON profiles FOR SELECT
    USING (
        id IN (
            SELECT user_id FROM organization_members
            WHERE organization_id = ANY(get_user_organization_ids())
            AND status = 'active'
        )
    );

-- ============================================================
-- ORGANIZATIONS
-- ============================================================

CREATE POLICY "Members can view their organization"
    ON organizations FOR SELECT
    USING (id = ANY(get_user_organization_ids()));

CREATE POLICY "Admins can update their organization"
    ON organizations FOR UPDATE
    USING (
        id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
        )
    );

-- ============================================================
-- ORGANIZATION MEMBERS
-- ============================================================

CREATE POLICY "Members can view org members"
    ON organization_members FOR SELECT
    USING (organization_id = ANY(get_user_organization_ids()));

CREATE POLICY "Admins can manage members"
    ON organization_members FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
        )
    );

CREATE POLICY "Users can insert own membership"
    ON organization_members FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- ============================================================
-- PROJECTS
-- ============================================================

CREATE POLICY "Members can view org projects"
    ON projects FOR SELECT
    USING (organization_id = ANY(get_user_organization_ids()));

CREATE POLICY "Engineers and admins can create projects"
    ON projects FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'engineer') AND status = 'active'
        )
    );

CREATE POLICY "Engineers and admins can update projects"
    ON projects FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'engineer') AND status = 'active'
        )
    );

-- ============================================================
-- PIPELINES
-- ============================================================

CREATE POLICY "Members can view pipelines"
    ON pipelines FOR SELECT
    USING (organization_id = ANY(get_user_organization_ids()));

CREATE POLICY "Engineers and admins can manage pipelines"
    ON pipelines FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'engineer') AND status = 'active'
        )
    );

-- ============================================================
-- INSPECTION RUNS
-- ============================================================

CREATE POLICY "Members can view inspection runs"
    ON inspection_runs FOR SELECT
    USING (organization_id = ANY(get_user_organization_ids()));

CREATE POLICY "Engineers and admins can manage runs"
    ON inspection_runs FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'engineer') AND status = 'active'
        )
    );

-- ============================================================
-- UPLOADED FILES
-- ============================================================

CREATE POLICY "Members can view uploaded files"
    ON uploaded_files FOR SELECT
    USING (organization_id = ANY(get_user_organization_ids()));

CREATE POLICY "Engineers and admins can manage files"
    ON uploaded_files FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'engineer') AND status = 'active'
        )
    );

-- ============================================================
-- ANALYSIS JOBS
-- ============================================================

CREATE POLICY "Members can view analysis jobs"
    ON analysis_jobs FOR SELECT
    USING (organization_id = ANY(get_user_organization_ids()));

CREATE POLICY "Engineers and admins can manage jobs"
    ON analysis_jobs FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'engineer') AND status = 'active'
        )
    );

-- ============================================================
-- DEFECTS
-- ============================================================

CREATE POLICY "Members can view defects"
    ON defects FOR SELECT
    USING (organization_id = ANY(get_user_organization_ids()));

CREATE POLICY "Service role can insert defects"
    ON defects FOR INSERT
    WITH CHECK (organization_id = ANY(get_user_organization_ids()));

-- ============================================================
-- SEGMENT RISK SCORES
-- ============================================================

CREATE POLICY "Members can view segment risk scores"
    ON segment_risk_scores FOR SELECT
    USING (organization_id = ANY(get_user_organization_ids()));

CREATE POLICY "Service role can insert segment scores"
    ON segment_risk_scores FOR INSERT
    WITH CHECK (organization_id = ANY(get_user_organization_ids()));

-- ============================================================
-- REPORTS
-- ============================================================

CREATE POLICY "Members can view reports"
    ON reports FOR SELECT
    USING (organization_id = ANY(get_user_organization_ids()));

CREATE POLICY "Engineers and admins can manage reports"
    ON reports FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'engineer') AND status = 'active'
        )
    );
