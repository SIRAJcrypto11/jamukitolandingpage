import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Eye, 
  Edit, 
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  Award
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function KPIList({ kpis, employees, companyId, onUpdate }) {
  const [expandedKPI, setExpandedKPI] = useState(null);

  const handleDelete = async (kpiId) => {
    if (!confirm('Yakin ingin menghapus KPI ini?')) return;

    try {
      await base44.entities.CompanyKPI.delete(kpiId);
      toast.success('KPI berhasil dihapus');
      onUpdate();
    } catch (error) {
      console.error('Error deleting KPI:', error);
      toast.error('Gagal menghapus KPI');
    }
  };

  const getRatingBadge = (rating) => {
    const badges = {
      outstanding: { color: 'bg-green-600', label: 'Outstanding' },
      exceeds: { color: 'bg-blue-600', label: 'Exceeds' },
      meets: { color: 'bg-purple-600', label: 'Meets' },
      needs_improvement: { color: 'bg-yellow-600', label: 'Needs Improvement' },
      unsatisfactory: { color: 'bg-red-600', label: 'Unsatisfactory' }
    };
    const badge = badges[rating] || badges.meets;
    return <Badge className={badge.color}>{badge.label}</Badge>;
  };

  const getScoreIcon = (actual, target) => {
    const percentage = (actual / target) * 100;
    if (percentage >= 100) return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (percentage >= 70) return <Minus className="w-4 h-4 text-yellow-400" />;
    return <TrendingDown className="w-4 h-4 text-red-400" />;
  };

  if (kpis.length === 0) {
    return (
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="p-12 text-center">
          <Award className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Belum ada KPI review</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {kpis.map((kpi) => {
        const employee = employees.find(e => e.id === kpi.employee_id);
        const isExpanded = expandedKPI === kpi.id;

        return (
          <Card key={kpi.id} className="bg-gray-900 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-white">{kpi.employee_name}</h3>
                    {getRatingBadge(kpi.rating)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span>Period: {format(new Date(kpi.period), 'MMMM yyyy', { locale: id })}</span>
                    <span>•</span>
                    <span>Score: <span className="text-white font-bold">{kpi.overall_score?.toFixed(1)}</span>/100</span>
                    {employee && (
                      <>
                        <span>•</span>
                        <span>{employee.department} - {employee.position}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setExpandedKPI(isExpanded ? null : kpi.id)}
                    className="text-blue-400 hover:bg-gray-800"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(kpi.id)}
                    className="text-red-400 hover:bg-gray-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Progress value={kpi.overall_score} className="h-3" />

              {isExpanded && (
                <div className="mt-6 space-y-4 pt-6 border-t border-gray-700">
                  <h4 className="text-white font-semibold mb-3">Breakdown Metrics:</h4>
                  {kpi.metrics?.map((metric, idx) => {
                    const achievement = (metric.actual / metric.target) * 100;
                    return (
                      <div key={idx} className="bg-gray-800 p-4 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {getScoreIcon(metric.actual, metric.target)}
                              <h5 className="text-white font-semibold">{metric.name}</h5>
                              <Badge variant="outline" className="ml-auto">
                                Weight: {metric.weight}%
                              </Badge>
                            </div>
                            {metric.description && (
                              <p className="text-sm text-gray-400 mt-1">{metric.description}</p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mt-3">
                          <div>
                            <p className="text-xs text-gray-400">Target</p>
                            <p className="text-white font-semibold">{metric.target} {metric.unit}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Actual</p>
                            <p className="text-white font-semibold">{metric.actual} {metric.unit}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Achievement</p>
                            <p className={`font-bold ${achievement >= 100 ? 'text-green-400' : achievement >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>
                              {achievement.toFixed(1)}%
                            </p>
                          </div>
                        </div>

                        <Progress value={Math.min(100, achievement)} className="mt-3 h-2" />
                      </div>
                    );
                  })}

                  {kpi.reviewer_notes && (
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <p className="text-sm font-semibold text-gray-400 mb-2">Catatan Reviewer:</p>
                      <p className="text-white">{kpi.reviewer_notes}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}