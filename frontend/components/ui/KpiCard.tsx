import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface KpiCardProps {
  label: string
  value: string | number
  sub?: string
  icon?: LucideIcon
  iconColor?: string
  trend?: { value: number; label: string }
  className?: string
  highlight?: boolean
}

export function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  iconColor = 'text-slate-400',
  trend,
  className,
  highlight,
}: KpiCardProps) {
  return (
    <div className={cn('kpi-card', highlight && 'border-red-200 bg-red-50', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className={cn('kpi-label', highlight && 'text-red-500')}>{label}</p>
          <p className={cn('kpi-value mt-1', highlight && 'text-red-700')}>{value}</p>
          {sub && <p className="kpi-sub">{sub}</p>}
          {trend && (
            <p className={cn(
              'text-xs font-medium mt-2',
              trend.value >= 0 ? 'text-emerald-600' : 'text-red-600'
            )}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn('ml-3 mt-0.5', iconColor)}>
            <Icon className="w-5 h-5" strokeWidth={1.5} />
          </div>
        )}
      </div>
    </div>
  )
}
