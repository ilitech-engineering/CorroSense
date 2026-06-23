import { Sidebar } from './Sidebar'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <main className="ml-56 pt-14 min-h-screen">
        <div className="px-8 py-6">
          {children}
        </div>
      </main>
    </div>
  )
}
