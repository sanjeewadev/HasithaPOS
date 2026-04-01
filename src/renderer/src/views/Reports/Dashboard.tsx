// src/renderer/src/views/Reports/Dashboard.tsx
import React, { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const [metrics, setMetrics] = useState({
    grossSales: 0,
    netProfit: 0,
    pendingCredit: 0
  })
  const [chartData, setChartData] = useState<any[]>([])
  const [chartFilter, setChartFilter] = useState<'7_days' | 'this_month'>('7_days')

  const loadData = async () => {
    try {
      // @ts-ignore
      setMetrics(await window.api.getDashboardMetrics())
      // @ts-ignore
      setChartData(await window.api.getChartData(chartFilter))
    } catch (error) {
      console.error('Failed to load dashboard data', error)
    }
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [chartFilter])

  const formatCurrency = (value: number) => `Rs ${value.toLocaleString()}`

  return (
    <div className={styles.container}>
      {/* --- TOP: THE KPI RIBBON (NOW 3 CARDS) --- */}
      <div className={styles.kpiGrid}>
        <div className={`${styles.kpiCard} ${styles.primary}`}>
          <div className={styles.kpiTitle}>Today's Gross Sales</div>
          <div className={styles.kpiValue}>Rs {(metrics.grossSales || 0).toFixed(2)}</div>
        </div>

        <div className={`${styles.kpiCard} ${styles.success}`}>
          <div className={styles.kpiTitle}>Today's Net Profit</div>
          <div className={styles.kpiValue}>Rs {(metrics.netProfit || 0).toFixed(2)}</div>
        </div>

        <div className={`${styles.kpiCard} ${styles.warning}`}>
          <div className={styles.kpiTitle}>Pending Credit Owed To You</div>
          <div className={styles.kpiValue}>Rs {(metrics.pendingCredit || 0).toFixed(2)}</div>
        </div>
      </div>

      {/* --- MIDDLE: THE INTERACTIVE PROFIT CHART (FULL SCREEN) --- */}
      <div className={styles.chartCard}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitle}>Revenue vs. Profit Analysis</div>
          <select
            className={styles.chartSelect}
            value={chartFilter}
            onChange={(e) => setChartFilter(e.target.value as any)}
          >
            <option value="7_days">Last 7 Days</option>
            <option value="this_month">This Month</option>
          </select>
        </div>
        <div className={styles.chartWrapper}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="dateLabel"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12 }}
                dy={10}
              />
              <YAxis
                tickFormatter={formatCurrency}
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }}
                contentStyle={{
                  borderRadius: '8px',
                  border: 'none',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                }}
                formatter={(value: any) => [`Rs ${Number(value).toFixed(2)}`, '']}
              />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
              <Bar
                dataKey="sales"
                name="Gross Revenue"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
                maxBarSize={50}
              />
              <Bar
                dataKey="profit"
                name="Net Profit"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                maxBarSize={50}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
