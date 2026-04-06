// src/renderer/src/views/Reports/Dashboard.tsx
import { useState, useEffect } from 'react'
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
import { FiRefreshCw, FiDollarSign, FiTrendingUp, FiCreditCard } from 'react-icons/fi'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const [metrics, setMetrics] = useState({
    grossSales: 0,
    netProfit: 0,
    pendingCredit: 0
  })
  const [chartData, setChartData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Default to "This Month" (from the 1st of the current month)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(1) // Sets the date to the 1st of the current month
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1) // 🚀 Adds exactly 1 day to today's date
    return d.toISOString().split('T')[0]
  })

  const loadData = async () => {
    setLoading(true)
    try {
      // @ts-ignore
      const data = await window.api.getDashboardData(startDate, endDate)

      if (data) {
        setMetrics(data.metrics || { grossSales: 0, netProfit: 0, pendingCredit: 0 })
        setChartData(data.chartData || [])
      }
    } catch (error) {
      console.error('Failed to load dashboard data', error)
      setMetrics({ grossSales: 0, netProfit: 0, pendingCredit: 0 })
      setChartData([])
    } finally {
      setLoading(false)
    }
  }

  // Reload data whenever the dates change
  useEffect(() => {
    loadData()
  }, [startDate, endDate])

  const formatCurrency = (value: number) => `Rs ${value.toLocaleString()}`

  return (
    <div className={styles.container}>
      {/* 🚀 WRAPPED IN THE UNIFIED MASTER PANEL */}
      <div className={styles.panel}>
        {/* --- TOP: FILTER & CONTROLS --- */}
        <div className={styles.controlHeader}>
          <h2 className={styles.pageTitle}>EXECUTIVE DASHBOARD</h2>
          <div className={styles.filterGroup}>
            <div className={styles.dateFilters}>
              <label>From:</label>
              <input
                type="date"
                className={styles.dateInput}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
              <label>To:</label>
              <input
                type="date"
                className={styles.dateInput}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
            <button className={styles.refreshBtn} onClick={loadData} disabled={loading}>
              <FiRefreshCw className={loading ? styles.spinning : ''} />
              {loading ? 'LOADING...' : 'REFRESH'}
            </button>
          </div>
        </div>

        {/* --- MIDDLE: THE KPI RIBBON --- */}
        <div className={styles.kpiGrid}>
          <div className={`${styles.kpiCard} ${styles.primary}`}>
            <div className={styles.kpiHeader}>
              <div className={styles.kpiTitle}>Gross Sales (Period)</div>
              <FiDollarSign className={styles.kpiIcon} />
            </div>
            <div className={styles.kpiValue}>Rs {(metrics.grossSales || 0).toFixed(2)}</div>
          </div>

          <div className={`${styles.kpiCard} ${styles.success}`}>
            <div className={styles.kpiHeader}>
              <div className={styles.kpiTitle}>Net Profit (Period)</div>
              <FiTrendingUp className={styles.kpiIcon} />
            </div>
            <div className={styles.kpiValue}>Rs {(metrics.netProfit || 0).toFixed(2)}</div>
          </div>

          <div className={`${styles.kpiCard} ${styles.warning}`}>
            <div className={styles.kpiHeader}>
              <div className={styles.kpiTitle}>Pending Credit Owed (All Time)</div>
              <FiCreditCard className={styles.kpiIcon} />
            </div>
            <div className={styles.kpiValue}>Rs {(metrics.pendingCredit || 0).toFixed(2)}</div>
          </div>
        </div>

        {/* --- BOTTOM: THE INTERACTIVE PROFIT CHART --- */}
        <div className={styles.chartCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>Revenue vs. Profit Analysis</div>
          </div>
          <div className={styles.chartWrapper}>
            {chartData.length === 0 ? (
              <div className={styles.emptyChart}>
                No sales data found for the selected date range.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="dateLabel"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                    dy={10}
                  />
                  <YAxis
                    tickFormatter={formatCurrency}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }}
                    contentStyle={{
                      borderRadius: '4px', // 🚀 Adjusted to 4px
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
                    }}
                    formatter={(value: any) => [`Rs ${Number(value).toFixed(2)}`, '']}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ paddingTop: '20px', fontWeight: 700 }}
                  />
                  <Bar
                    dataKey="sales"
                    name="Gross Revenue"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]} // 🚀 Top corners 4px
                    maxBarSize={60}
                  />
                  <Bar
                    dataKey="profit"
                    name="Net Profit"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]} // 🚀 Top corners 4px
                    maxBarSize={60}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>{' '}
      {/* 🚀 THE FIX: This closing div was missing/misplaced! */}
    </div>
  )
}
