import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart, LineElement, LinearScale, CategoryScale, PointElement, Title, Tooltip, Legend
} from 'chart.js';
import {
  FaCalendarWeek, FaCalendarAlt,
  FaRegCalendar, FaChartPie
} from 'react-icons/fa';
import './AdminDashboardStats.css';

Chart.register(LineElement, LinearScale, CategoryScale, PointElement, Title, Tooltip, Legend);

const rangeOptions = [
  { key: '7d', label: '7 Days', icon: <FaCalendarWeek /> },
  { key: '1m', label: '1 Month', icon: <FaCalendarAlt /> },
  { key: '1y', label: '1 Year', icon: <FaRegCalendar /> },
  { key: '5y', label: '5 Years', icon: <FaChartPie /> }
];

const AdminDashboardStats = () => {
  const [stats, setStats] = useState(null);
  const [range, setRange] = useState('7d');
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`/api/admin/stats?range=${range}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error(`Failed to fetch stats: ${res.status}`);
        return res.json();
      })
      .then(data => setStats(data))
      .catch(err => {
        console.error('Stats fetch error:', err);
        setError('Failed to fetch stats');
      });
  }, [range]);

  if (error)
    return <div className="admin-stats-error">{error}</div>;
  if (!stats)
    return <div className="admin-stats-loading">Loading performance stats...</div>;

  const labels = stats.daily.map(d => d._id);
  const revenueData = stats.daily.map(d => d.revenue);
  const ordersData = stats.daily.map(d => d.orders);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Revenue',
        data: revenueData,
        fill: true,
        borderColor: '#2196f3',
        backgroundColor: 'rgba(33,150,243,0.14)',
        yAxisID: 'y',
      },
      {
        label: 'Orders',
        data: ordersData,
        fill: false,
        borderColor: '#4caf50',
        backgroundColor: 'rgba(76,175,80,0.07)',
        yAxisID: 'y1',
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: false }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Revenue (₹)' }
      },
      y1: {
        beginAtZero: true,
        title: { display: true, text: 'Orders' },
        position: 'right',
        grid: { drawOnChartArea: false }
      }
    }
  };

  return (
    <div className="admin-stats-panel-flex">
      {/* Sidebar for range selector */}
      <div className="stats-sidebar">
        {rangeOptions.map(opt => (
          <div
            key={opt.key}
            className={`stats-sidebar-option${range === opt.key ? ' selected' : ''}`}
            onClick={() => setRange(opt.key)}
          >
            <span className="sidebar-icon">{opt.icon}</span>
            <span className="sidebar-label">{opt.label}</span>
          </div>
        ))}
      </div>
      {/* Main stats content */}
      <div className="stats-main-content">
        <h2 style={{marginBottom:'16px', color:'#1a237e'}}>Performance Overview</h2>
        <div className="stats-summary">
          <div>
            <strong>Total Orders</strong>
            <div className="admin-stats-summary-value">{stats.totalOrders}</div>
          </div>
          <div>
            <strong>Total Users</strong>
            <div className="admin-stats-summary-value">{stats.totalUsers}</div>
          </div>
          <div>
            <strong>Total Revenue</strong>
            <div className="admin-stats-summary-value">₹{stats.totalRevenue.toFixed(2)}</div>
          </div>
        </div>
        <div style={{maxWidth:'700px'}}>
          <Line data={chartData} options={chartOptions}/>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardStats;
