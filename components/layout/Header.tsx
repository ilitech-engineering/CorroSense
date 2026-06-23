'use client'

import { ChevronRight, Bell } from 'lucide-react'
import Link from 'next/link'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface HeaderProps {
  breadcrumbs?: BreadcrumbItem[]
  actions?: React.ReactNode
}

export function Header({ breadcrumbs = [], actions }: HeaderProps) {
  return (
    <header className="fixed top-0 left-56 right-0 h-14 bg-white border-b border-slate-200 flex items-center px-6 z-10">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm flex-1">
        {breadcrumbs.map((item, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="w-3 h-3 text-slate-300" />}
            {item.href ? (
              <Link
                href={item.href}
                className="text-slate-500 hover:text-slate-900 transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-slate-900 font-medium">{item.label}</span>
            )}
          </span>
        ))}
      </nav>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {actions}
        <button className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors relative">
          <Bell className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
