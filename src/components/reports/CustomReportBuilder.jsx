import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  FileText,
  Save,
  Trash2,
  Eye,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

export default function CustomReportBuilder({ companyId, onSave }) {
  const [templateName, setTemplateName] = useState('');
  const [selectedModules, setSelectedModules] = useState({
    hr: false,
    payroll: false,
    projects: false,
    assets: false,
    sales: false,
    inventory: false
  });
  const [selectedMetrics, setSelectedMetrics] = useState({
    hr: [],
    payroll: [],
    projects: [],
    assets: [],
    sales: []
  });
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const availableMetrics = {
    hr: [
      { id: 'employee_count', label: 'Employee Count' },
      { id: 'turnover_rate', label: 'Turnover Rate' },
      { id: 'attendance_rate', label: 'Attendance Rate' },
      { id: 'avg_salary', label: 'Average Salary' }
    ],
    payroll: [
      { id: 'total_payroll', label: 'Total Payroll Cost' },
      { id: 'overtime_cost', label: 'Overtime Cost' },
      { id: 'tax_total', label: 'Total Tax' },
      { id: 'bpjs_total', label: 'Total BPJS' }
    ],
    projects: [
      { id: 'completion_rate', label: 'Completion Rate' },
      { id: 'budget_variance', label: 'Budget Variance' },
      { id: 'ontime_delivery', label: 'On-Time Delivery %' }
    ],
    assets: [
      { id: 'total_value', label: 'Total Asset Value' },
      { id: 'depreciation', label: 'Depreciation' },
      { id: 'maintenance_cost', label: 'Maintenance Cost' }
    ],
    sales: [
      { id: 'total_revenue', label: 'Total Revenue' },
      { id: 'avg_transaction', label: 'Average Transaction' },
      { id: 'customer_retention', label: 'Customer Retention %' }
    ]
  };

  const toggleModule = (module) => {
    setSelectedModules(prev => ({
      ...prev,
      [module]: !prev[module]
    }));
  };

  const toggleMetric = (module, metricId) => {
    setSelectedMetrics(prev => ({
      ...prev,
      [module]: prev[module].includes(metricId)
        ? prev[module].filter(m => m !== metricId)
        : [...prev[module], metricId]
    }));
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      toast.error('Template name required');
      return;
    }

    const hasSelectedMetrics = Object.values(selectedMetrics).some(m => m.length > 0);
    if (!hasSelectedMetrics) {
      toast.error('Select at least one metric');
      return;
    }

    setIsSaving(true);

    const template = {
      id: Date.now(),
      name: templateName,
      companyId: companyId,
      modules: selectedModules,
      metrics: selectedMetrics,
      createdAt: new Date().toISOString()
    };

    const templates = JSON.parse(localStorage.getItem('report_templates') || '[]');
    templates.push(template);
    localStorage.setItem('report_templates', JSON.stringify(templates));

    setSavedTemplates(templates);
    toast.success('✅ Template saved!');
    
    if (onSave) {
      onSave(template);
    }

    setTemplateName('');
    setSelectedModules({
      hr: false,
      payroll: false,
      projects: false,
      assets: false,
      sales: false
    });
    setSelectedMetrics({
      hr: [],
      payroll: [],
      projects: [],
      assets: [],
      sales: []
    });

    setIsSaving(false);
  };

  const loadTemplate = (template) => {
    setTemplateName(template.name);
    setSelectedModules(template.modules);
    setSelectedMetrics(template.metrics);
    toast.success('Template loaded!');
  };

  const deleteTemplate = (templateId) => {
    if (!confirm('Delete this template?')) return;

    const templates = JSON.parse(localStorage.getItem('report_templates') || '[]');
    const updated = templates.filter(t => t.id !== templateId);
    localStorage.setItem('report_templates', JSON.stringify(updated));
    setSavedTemplates(updated);
    toast.success('Template deleted');
  };

  useEffect(() => {
    const templates = JSON.parse(localStorage.getItem('report_templates') || '[]');
    setSavedTemplates(templates.filter(t => t.companyId === companyId));
  }, [companyId]);

  return (
    <div className="space-y-6">
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            Create Custom Report Template
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-gray-300">Template Name</Label>
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g., Monthly Executive Summary"
              className="bg-gray-800 border-gray-700 text-white mt-2"
            />
          </div>

          <div>
            <Label className="text-white mb-3 block">Select Modules & Metrics:</Label>
            
            {Object.keys(availableMetrics).map(module => (
              <div key={module} className="mb-4 bg-gray-800 p-4 rounded-lg border border-gray-700">
                <div className="flex items-center gap-2 mb-3">
                  <Checkbox
                    checked={selectedModules[module]}
                    onCheckedChange={() => toggleModule(module)}
                    className="border-gray-600"
                  />
                  <span className="text-white font-semibold capitalize">{module}</span>
                </div>

                {selectedModules[module] && (
                  <div className="ml-6 space-y-2">
                    {availableMetrics[module].map(metric => (
                      <div key={metric.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedMetrics[module].includes(metric.id)}
                          onCheckedChange={() => toggleMetric(module, metric.id)}
                          className="border-gray-600"
                        />
                        <span className="text-sm text-gray-300">{metric.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <Button
            onClick={handleSaveTemplate}
            disabled={isSaving}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {isSaving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
            ) : (
              <><Save className="w-4 h-4 mr-2" /> Save Template</>
            )}
          </Button>
        </CardContent>
      </Card>

      {savedTemplates.length > 0 && (
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Saved Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {savedTemplates.map(template => (
                <div key={template.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700">
                  <div className="flex-1">
                    <p className="font-semibold text-white">{template.name}</p>
                    <div className="flex gap-2 mt-1">
                      {Object.entries(template.modules)
                        .filter(([_, enabled]) => enabled)
                        .map(([module]) => (
                          <Badge key={module} variant="outline" className="text-xs">
                            {module}
                          </Badge>
                        ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => loadTemplate(template)}
                      className="border-blue-600 text-blue-400"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Load
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteTemplate(template.id)}
                      className="text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}