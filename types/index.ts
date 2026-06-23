// ============================================================
// CorroSense – Core TypeScript Types
// ============================================================

export type UserRole = 'admin' | 'engineer' | 'viewer'
export type MemberStatus = 'active' | 'invited' | 'suspended'
export type PipelineMaterial = 'carbon_steel' | 'stainless_steel' | 'duplex_steel' | 'hdpe' | 'frp' | 'other'
export type TransportedFluid = 'crude_oil' | 'natural_gas' | 'refined_product' | 'water' | 'multiphase' | 'other'
export type ToolType = 'MFL' | 'UT' | 'combo' | 'EMAT' | 'other'
export type RunStatus = 'draft' | 'files_uploaded' | 'queued' | 'processing' | 'completed' | 'failed' | 'archived'
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled'
export type FileProcessingState = 'pending' | 'processing' | 'processed' | 'error'
export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical'
export type DefectType = 'corrosion' | 'metal_loss' | 'anomaly' | 'crack' | 'dent' | 'other'
export type ProjectStatus = 'active' | 'completed' | 'on_hold' | 'cancelled'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  title: string | null
  phone: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Organization {
  id: string
  name: string
  slug: string
  industry: string | null
  country: string
  address: string | null
  contact_email: string | null
  logo_url: string | null
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface OrganizationMember {
  id: string
  organization_id: string
  user_id: string
  role: UserRole
  status: MemberStatus
  invited_by: string | null
  joined_at: string | null
  created_at: string
  updated_at: string
  profile?: Profile
}

export interface Project {
  id: string
  organization_id: string
  name: string
  code: string
  description: string | null
  location: string | null
  start_date: string | null
  end_date: string | null
  status: ProjectStatus
  created_by: string | null
  created_at: string
  updated_at: string
  // Computed
  run_count?: number
  pipeline_count?: number
}

export interface Pipeline {
  id: string
  organization_id: string
  project_id: string | null
  name: string
  code: string
  location: string | null
  total_length_m: number | null
  diameter_mm: number | null
  nominal_wall_thickness_mm: number | null
  material: PipelineMaterial
  transported_fluid: TransportedFluid
  nominal_pressure_bar: number | null
  max_allowable_pressure_bar: number | null
  design_temperature_c: number | null
  commissioned_at: string | null
  operator: string | null
  manufacturer: string | null
  coating_type: string | null
  cathodic_protection: boolean
  notes: string | null
  metadata: Record<string, unknown>
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface InspectionRun {
  id: string
  organization_id: string
  project_id: string
  pipeline_id: string
  name: string
  inspection_date: string
  tool_type: ToolType
  tool_vendor: string | null
  tool_version: string | null
  inspected_length_m: number | null
  pull_speed_m_min: number | null
  operator_name: string | null
  weather_conditions: string | null
  comment: string | null
  status: RunStatus
  created_by: string | null
  created_at: string
  updated_at: string
  // Relations
  pipeline?: Pipeline
  project?: Project
  uploaded_files?: UploadedFile[]
  analysis_jobs?: AnalysisJob[]
}

export interface UploadedFile {
  id: string
  organization_id: string
  run_id: string
  filename: string
  original_name: string
  file_size_bytes: number | null
  mime_type: string | null
  storage_path: string
  storage_bucket: string
  processing_state: FileProcessingState
  checksum_md5: string | null
  row_count: number | null
  column_names: string[] | null
  preview_data: unknown[] | null
  error_message: string | null
  uploaded_by: string | null
  created_at: string
  updated_at: string
}

export interface AnalysisJob {
  id: string
  organization_id: string
  run_id: string
  status: JobStatus
  progress_pct: number
  analyzer_version: string
  parameters: Record<string, unknown>
  error_message: string | null
  defects_found: number
  segments_analyzed: number
  queued_at: string
  started_at: string | null
  completed_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Defect {
  id: string
  organization_id: string
  run_id: string
  job_id: string
  pipeline_id: string
  distance_from_start_m: number
  clock_position: string | null
  segment_label: string | null
  defect_type: DefectType
  length_mm: number | null
  width_mm: number | null
  depth_mm: number | null
  depth_percent: number | null
  corrosion_probability: number | null
  severity_level: SeverityLevel
  confidence_score: number | null
  risk_score: number | null
  signal_strength: number | null
  anomaly_index: number | null
  wall_thickness_mm: number | null
  nominal_thickness_mm: number | null
  notes: string | null
  flagged_for_review: boolean
  created_at: string
}

export interface SegmentRiskScore {
  id: string
  organization_id: string
  run_id: string
  job_id: string
  pipeline_id: string
  segment_label: string
  segment_start_m: number
  segment_end_m: number
  defect_count: number
  dominant_severity: SeverityLevel | null
  max_depth_percent: number | null
  avg_depth_percent: number | null
  avg_corrosion_probability: number | null
  max_corrosion_probability: number | null
  aggregated_risk_score: number | null
  critical_defect_count: number
  high_defect_count: number
  notes: string | null
  created_at: string
}

export interface Report {
  id: string
  organization_id: string
  run_id: string | null
  job_id: string | null
  title: string
  report_type: string
  format: 'csv' | 'json' | 'pdf'
  storage_path: string | null
  storage_bucket: string
  status: 'pending' | 'generating' | 'ready' | 'failed'
  file_size_bytes: number | null
  generated_by: string | null
  generated_at: string | null
  expires_at: string | null
  created_at: string
}

// API response types
export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  page_size: number
}

// Dashboard stats
export interface DashboardStats {
  active_projects: number
  total_pipelines: number
  total_runs: number
  runs_in_progress: number
  critical_defects: number
  high_defects: number
  completed_jobs_last_30d: number
}

// Analysis job request
export interface AnalyzeRunRequest {
  run_id: string
  parameters?: {
    segment_length_m?: number
    anomaly_threshold?: number
    depth_threshold_pct?: number
  }
}
