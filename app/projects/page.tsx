import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { Header } from '@/components/layout/Header'
import { ProjectStatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate } from '@/lib/utils'
import { FolderOpen, Plus, MapPin, Calendar } from 'lucide-react'
import Link from 'next/link'

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('organization_id', membership?.organization_id)
    .order('created_at', { ascending: false })

  const canEdit = ['admin', 'engineer'].includes(membership?.role ?? '')

  return (
    <AppShell>
      <Header
        breadcrumbs={[{ label: 'Projects' }]}
        actions={
          canEdit && (
            <Link href="/projects/new" className="btn-primary btn-sm">
              <Plus className="w-4 h-4" />
              New Project
            </Link>
          )
        }
      />

      <div className="page-header">
        <h1 className="page-title">Projects</h1>
        <p className="page-subtitle">{projects?.length ?? 0} project{projects?.length !== 1 ? 's' : ''} in your organization</p>
      </div>

      {projects && projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map(project => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="card p-5 hover:border-slate-300 hover:shadow-sm transition-all group cursor-pointer block"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0 mr-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{project.code}</span>
                    <ProjectStatusBadge status={project.status} />
                  </div>
                  <h3 className="font-semibold text-slate-900 group-hover:text-slate-700 truncate">{project.name}</h3>
                </div>
                <FolderOpen className="w-5 h-5 text-slate-300 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
              </div>

              {project.description && (
                <p className="text-sm text-slate-500 mb-3 line-clamp-2">{project.description}</p>
              )}

              <div className="flex items-center gap-4 text-xs text-slate-400 mt-3">
                {project.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {project.location}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(project.created_at)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card">
          <EmptyState
            icon={FolderOpen}
            title="No projects yet"
            description="Create your first inspection project to start managing pipeline integrity campaigns."
            action={
              canEdit && (
                <Link href="/projects/new" className="btn-primary btn-sm">
                  <Plus className="w-4 h-4" />
                  Create project
                </Link>
              )
            }
          />
        </div>
      )}
    </AppShell>
  )
}
