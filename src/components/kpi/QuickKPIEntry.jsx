import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckSquare, Sparkles, Zap, FileText, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function QuickKPIEntry({ employees, companyId, period, onSuccess }) {
  const [templates, setTemplates] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, [companyId]);

  const loadTemplates = async () => {
    try {
      const templatesData = await base44.entities.KPITemplate.filter({
        company_id: companyId,
        is_active: true
      });
      setTemplates(templatesData || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const getTemplateForEmployee = (employee) => {
    const normalize = (s) => (s || '').toLowerCase().trim();
    const empPosition = normalize(employee.position);
    const empDept = normalize(employee.department);
    const empRole = normalize(employee.role);

    return templates.find(t => {
      const roles = (t.applicable_roles || []).map(normalize);
      const depts = (t.applicable_departments || []).map(normalize);
      return (
        (empPosition && roles.includes(empPosition)) ||
        (empDept && roles.includes(empDept)) ||
        (empRole && roles.includes(empRole)) ||
        (empDept && depts.includes(empDept)) ||
        (empPosition && depts.includes(empPosition))
      );
    });
  };

  const autoCalculateMetric = async (employee, metric, period) => {
    try {
      if (metric.calculation_method === 'manual') {
        return metric.default_target;
      }

      const currentMonth = period;
      const startDate = `${currentMonth}-01`;
      const endDate = `${currentMonth}-31`;

      if (metric.calculation_method === 'auto_from_attendance') {
        const attendance = await base44.entities.CompanyAttendance.filter({
          company_id: companyId,
          employee_id: employee.id,
          date: { $gte: startDate, $lte: endDate }
        });

        const presentDays = attendance.filter(a => 
          a.status === 'present' || a.status === 'late'
        ).length;
        
        const totalDays = attendance.length;
        const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

        return attendanceRate;
      }

      if (metric.calculation_method === 'auto_from_sales') {
        const transactions = await base44.entities.CompanyPOSTransaction.filter({
          company_id: companyId,
          cashier_id: employee.id,
          created_date: { $gte: startDate, $lte: endDate }
        });

        const totalSales = transactions.reduce((sum, t) => sum + (t.total || 0), 0);
        return totalSales;
      }

      if (metric.calculation_method === 'auto_from_projects') {
        const projects = await base44.entities.Project.filter({
          company_id: companyId,
          team_members: { $contains: employee.id }
        });

        const completedProjects = projects.filter(p => p.status === 'completed').length;
        return completedProjects;
      }

      return metric.default_target;

    } catch (error) {
      console.error('Error auto-calculating metric:', error);
      return metric.default_target;
    }
  };

  const generateKPIsFromTemplates = async () => {
    if (selectedEmployees.length === 0) {
      toast.error('Pilih minimal 1 karyawan');
      return;
    }

    try {
      setIsGenerating(true);

      for (const employeeId of selectedEmployees) {
        const employee = employees.find(e => e.id === employeeId);
        const template = getTemplateForEmployee(employee);

        if (!template) {
          console.log(`No template for ${employee.user_name}`);
          continue;
        }

        const calculatedMetrics = await Promise.all(
          template.default_metrics.map(async (metric) => {
            const actualValue = await autoCalculateMetric(employee, metric, period);

            return {
              name: metric.metric_name,
              description: metric.description,
              target: metric.default_target,
              actual: actualValue,
              unit: metric.unit,
              weight: metric.weight
            };
          })
        );

        let overallScore = 0;
        calculatedMetrics.forEach(m => {
          const achievement = (m.actual / m.target) * 100;
          const weightedScore = achievement * (m.weight / 100);
          overallScore += weightedScore;
        });

        const rating = 
          overallScore >= 90 ? 'outstanding' :
          overallScore >= 80 ? 'exceeds' :
          overallScore >= 70 ? 'meets' :
          overallScore >= 50 ? 'needs_improvement' :
          'unsatisfactory';

        await base44.entities.CompanyKPI.create({
          company_id: companyId,
          employee_id: employee.id,
          employee_name: employee.user_name,
          period: period,
          metrics: calculatedMetrics,
          overall_score: Math.min(100, overallScore),
          rating: rating,
          status: 'finalized',
          auto_generated: true,
          template_id: template.id
        });
      }

      toast.success(`✅ KPI berhasil di-generate untuk ${selectedEmployees.length} karyawan!`);
      onSuccess();
      setSelectedEmployees([]);

    } catch (error) {
      console.error('Error generating KPIs:', error);
      toast.error('Gagal generate KPI');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleEmployee = (employeeId) => {
    if (selectedEmployees.includes(employeeId)) {
      setSelectedEmployees(selectedEmployees.filter(id => id !== employeeId));
    } else {
      setSelectedEmployees([...selectedEmployees, employeeId]);
    }
  };

  const selectAll = () => {
    if (selectedEmployees.length === employees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(employees.map(e => e.id));
    }
  };

  return (
    <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          Quick KPI Generation
          <Badge className="ml-2 bg-purple-600">
            Tinggal Centang!
          </Badge>
        </CardTitle>
        <p className="text-sm text-gray-400 mt-2">
          💡 Pilih karyawan dan KPI akan otomatis dihitung berdasarkan template dan data realtime
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between mb-3">
          <Button
            size="sm"
            variant="outline"
            onClick={selectAll}
            className="border-gray-600"
          >
            <CheckSquare className="w-4 h-4 mr-2" />
            {selectedEmployees.length === employees.length ? 'Unselect All' : 'Select All'}
          </Button>

          <span className="text-sm text-gray-400">
            {selectedEmployees.length} / {employees.length} dipilih
          </span>
        </div>

        <div className="max-h-96 overflow-y-auto space-y-2 bg-gray-800 p-3 rounded-lg">
          {employees.map((employee) => {
            const template = getTemplateForEmployee(employee);
            const hasTemplate = !!template;

            return (
              <div
                key={employee.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  hasTemplate ? 'border-purple-600 bg-purple-900/10' : 'border-gray-700 bg-gray-900'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <Checkbox
                    checked={selectedEmployees.includes(employee.id)}
                    onCheckedChange={() => toggleEmployee(employee.id)}
                    disabled={!hasTemplate}
                  />
                  <div className="flex-1">
                    <p className="text-white font-medium">{employee.user_name}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {employee.position}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {employee.department}
                      </Badge>
                    </div>
                  </div>
                </div>

                {hasTemplate ? (
                  <div className="text-right">
                    <Badge className="bg-green-600 text-xs">
                      <Sparkles className="w-3 h-3 mr-1" />
                      {template.template_name}
                    </Badge>
                    <p className="text-xs text-gray-400 mt-1">
                      {template.default_metrics?.length} metrics
                    </p>
                  </div>
                ) : (
                  <Badge variant="outline" className="text-xs text-gray-500">
                    No Template
                  </Badge>
                )}
              </div>
            );
          })}
        </div>

        <Button
          onClick={generateKPIsFromTemplates}
          disabled={isGenerating || selectedEmployees.length === 0}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          {isGenerating ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating KPIs...</>
          ) : (
            <><Zap className="w-4 h-4 mr-2" /> Generate KPI untuk {selectedEmployees.length} Karyawan</>
          )}
        </Button>

        {templates.length === 0 && (
          <div className="text-center py-4 text-gray-400 text-sm">
            <FileText className="w-8 h-8 mx-auto mb-2 text-gray-600" />
            <p>Belum ada KPI template.</p>
            <p>Buat template terlebih dahulu di tab "KPI Templates"</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}