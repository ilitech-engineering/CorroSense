import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { Header } from '@/components/layout/Header'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  engineer: 'Engineer',
  viewer: 'Viewer',
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role, organizations(id, name, slug, industry, country, contact_email, created_at)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  const org = membership?.organizations as any
  const isAdmin = membership?.role === 'admin'

  const { data: members } = await supabase
    .from('organization_members')
    .select('id, role, status, joined_at, profiles(full_name, email, title)')
    .eq('organization_id', membership?.organization_id)
    .order('created_at')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <AppShell>
      <Header breadcrumbs={[{ label: 'Settings' }]} />

      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Organization and account configuration</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="xl:col-span-2 space-y-6">
          {/* Organization */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Organization</h2>
            </div>
            <dl className="p-5 grid grid-cols-2 gap-4">
              {[
                ['Name', org?.name],
                ['Slug', org?.slug],
                ['Industry', org?.industry],
                ['Country', org?.country],
                ['Contact email', org?.contact_email],
                ['Created', org?.created_at ? formatDate(org.created_at) : null],
              ].map(([label, value]) =>
                value ? (
                  <div key={String(label)}>
                    <dt className="text-xs text-slate-400 mb-0.5">{label}</dt>
                    <dd className="text-sm font-medium text-slate-800">{value}</dd>
                  </div>
                ) : null
              )}
            </dl>
          </div>

          {/* Team members */}
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h2 className="card-title">Team Members</h2>
              <span className="text-xs text-slate-400">{members?.length ?? 0} members</span>
            </div>
            <div className="table-container rounded-t-none border-0 border-t border-slate-100">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Title</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {members?.map(m => {
                    const p = m.profiles as any
                    return (
                      <tr key={m.id}>
                        <td className="font-medium text-slate-800">{p?.full_name ?? '—'}</td>
                        <td className="text-xs text-slate-500">{p?.email}</td>
                        <td className="text-xs text-slate-400">{p?.title ?? '—'}</td>
                        <td>
                          <span className={cn(
                            'badge',
                            m.role === 'admin' ? 'text-indigo-700 bg-indigo-50 border-indigo-200' : 'text-slate-600 bg-slate-100 border-slate-200'
                          )}>
                            {ROLE_LABELS[m.role] ?? m.role}
                          </span>
                        </td>
                        <td>
                          <span className={cn(
                            'badge',
                            m.status === 'active' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-slate-500 bg-slate-100 border-slate-200'
                          )}>
                            {m.status}
                          </span>
                        </td>
                        <td className="text-xs text-slate-400">
                          {m.joined_at ? formatDate(m.joined_at) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* My profile */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">My Profile</h2>
            </div>
            <dl className="p-4 space-y-3">
              {[
                ['Full name', profile?.full_name],
                ['Email', profile?.email],
                ['Title', profile?.title],
                ['Role', ROLE_LABELS[membership?.role ?? ''] ?? membership?.role],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex items-center justify-between">
                  <dt className="text-xs text-slate-400">{label}</dt>
                  <dd className="text-xs font-medium text-slate-700">{value ?? '—'}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Analyzer version */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">System Info</h2>
            </div>
            <dl className="p-4 space-y-3">
              {[
                ['Platform', 'CorroSense MVP v1.0'],
                ['Analyzer', 'mock-v1 (deterministic)'],
                ['Segment length', '100 m (default)'],
                ['Database', 'Supabase Postgres'],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex items-center justify-between">
                  <dt className="text-xs text-slate-400">{label}</dt>
                  <dd className="text-xs font-mono text-slate-500">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
