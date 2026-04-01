import React from 'react';
import { TrendingUp, Users, FolderKanban, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { useLanguage } from '../contexts/LanguageContext';
import { mockProjects, mockClients, mockInvoices, mockRevenueData } from '../data/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Badge } from '../components/ui/badge';
import { formatCompactXAF } from '../utils/currency';

export function Dashboard() {
  const { t } = useLanguage();

  const stats = [
    {
      title: t('dashboard.totalRevenue'),
      value: formatCompactXAF(328000000),
      change: '+12.5%',
      icon: TrendingUp,
      iconClass: 'text-[#004aad]',
      iconBgClass: 'bg-[#004aad]/10',
    },
    {
      title: t('dashboard.activeProjects'),
      value: mockProjects.filter(p => p.status === 'active').length,
      change: '+3',
      icon: FolderKanban,
      iconClass: 'text-emerald-500',
      iconBgClass: 'bg-emerald-500/10',
    },
    {
      title: t('dashboard.totalClients'),
      value: mockClients.length,
      change: '+2',
      icon: Users,
      iconClass: 'text-amber-500',
      iconBgClass: 'bg-amber-500/10',
    },
    {
      title: t('dashboard.pendingInvoices'),
      value: mockInvoices.filter(i => i.status === 'pending').length,
      change: '-1',
      icon: FileText,
      iconClass: 'text-red-500',
      iconBgClass: 'bg-red-500/10',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-600 dark:text-green-400';
      case 'completed': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      case 'pending': return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
      default: return 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1>{t('dashboard.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('dashboard.welcome')}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription>{stat.title}</CardDescription>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.iconBgClass}`}>
                  <stat.icon className={`w-5 h-5 ${stat.iconClass}`} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <p className="font-bold text-3xl">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.change} {t('dashboard.vsLastMonth')}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.revenueOverview')}</CardTitle>
            <CardDescription>{t('dashboard.monthlyRevenueYear')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mockRevenueData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  stroke="currentColor"
                  opacity={0.5}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  stroke="currentColor"
                  opacity={0.5}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="revenue" fill="#004aad" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Projects */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.recentProjects')}</CardTitle>
            <CardDescription>{t('dashboard.latestUpdates')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockProjects.slice(0, 5).map((project) => (
                <div key={project.id} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{project.name}</p>
                    <p className="text-sm text-muted-foreground">{project.client}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">{project.progress}%</p>
                    </div>
                    <Badge className={getStatusColor(project.status)}>
                      {t(`projects.status.${project.status}`)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
