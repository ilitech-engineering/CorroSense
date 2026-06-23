'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FolderOpen,
  GitBranch,
  Activity,
  AlertTriangle,
  Settings,
  LogOut,
  ChevronRight,
  Gauge,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: FolderOpen },
  { href: '/pipelines', label: 'Pipelines', icon: GitBranch },
  { href: '/runs', label: 'Inspection Runs', icon: Activity },
  { href: '/defects', label: 'Defects Explorer', icon: AlertTriangle },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-white border-r border-slate-200 flex flex-col z-20">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-100">
        <div className="flex items-center justify-center w-7 h-7 bg-slate-800 rounded">
          <Gauge className="w-4 h-4 text-white" />
        </div>
        <div>
          <span className="text-sm font-bold text-slate-900 tracking-tight">CorroSense</span>
          <div className="text-[10px] text-slate-400 leading-none mt-0.5 uppercase tracking-wide">Integrity OS</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'sidebar-link group',
                active && 'active'
              )}
            >
              <Icon className={cn('w-4 h-4 flex-shrink-0', active ? 'text-slate-700' : 'text-slate-400 group-hover:text-slate-600')} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3 h-3 text-slate-400" />}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-slate-100">
        <button
          onClick={handleSignOut}
          className="sidebar-link w-full text-slate-500 hover:text-red-600 hover:bg-red-50"
        >
          <LogOut className="w-4 h-4 flex-shrink-0 text-slate-400" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  )
}
