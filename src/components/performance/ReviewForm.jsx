
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Loader2, Link as LinkIcon, Award, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import ReviewAIHelper from './ReviewAIHelper';

export default function ReviewForm({ employees, kpis, companyId, currentUser, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    employee_id: '',
    employee_name: '',
    review_period: new Date().toISOString().slice(0, 7),
    review_type: 'quarterly',
    competencies: [
      { competency_name: 'Communication', score: 3, comments: '' },
      { competency_name: 'Teamwork', score: 3, comments: '' },
      { competency_name: 'Problem Solving', score: 3, comments: '' }
    ],
    kpi_achievement: [],
    strengths: [''],
    areas_for_improvement: [''],
    development_plan: [{ goal: '', action: '', timeline: '', support_needed: '' }],
    reviewer_comments: '',
    employee_comments: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showAIHelper, setShowAIHelper] = useState(false);

  const calculateOverallScore = () => {
    const compScore = formData.competencies.reduce((sum, c) => sum + c.score, 0) / formData.competencies.length;
    const kpiScore = formData.kpi_achievement.length > 0 ?
      formData.kpi_achievement.reduce((sum, k) => sum + k.achievement_percentage, 0) / formData.kpi_achievement.length : 0;
    
    return ((compScore / 5) * 60) + ((kpiScore / 100) * 40);
  };

  const determineRating = (score) => {
    if (score >= 90) return 'outstanding';
    if (score >= 80) return 'exceeds_expectations';
    if (score >= 70) return 'meets_expectations';
    if (score >= 50) return 'needs_improvement';
    return 'unsatisfactory';
  };

  const handleEmployeeChange = (employeeId) => {
    const employee = employees.find(e => e.id === employeeId);
    const employeeKPIs = kpis.filter(k => k.employee_id === employeeId);

    setFormData({
      ...formData,
      employee_id: employeeId,
      employee_name: employee?.user_name || '',
      kpi_achievement: employeeKPIs.length > 0 ? employeeKPIs[0].metrics?.map(m => ({
        kpi_name: m.name,
        target: m.target,
        actual: m.actual,
        achievement_percentage: (m.actual / m.target) * 100,
        weight: m.weight
      })) : []
    });
  };

  // ✅ NEW: Apply AI suggestions
  const handleApplyAISuggestions = (suggestions) => {
    const updated = { ...formData };

    if (suggestions.competencies) {
      updated.competencies = suggestions.competencies;
    }
    if (suggestions.strengths) {
      updated.strengths = suggestions.strengths;
    }
    if (suggestions.areas_for_improvement) {
      updated.areas_for_improvement = suggestions.areas_for_improvement;
    }
    if (suggestions.reviewer_comments) {
      updated.reviewer_comments = suggestions.reviewer_comments;
    }
    if (suggestions.development_plan) {
      updated.development_plan = suggestions.development_plan;
    }

    setFormData(updated);
    toast.success('✅ AI suggestions applied!');
    setShowAIHelper(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.employee_id) {
      toast.error('Pilih karyawan terlebih dahulu');
      return;
    }

    try {
      setIsSaving(true);

      const overallScore = calculateOverallScore();
      const rating = determineRating(overallScore);

      await base44.entities.PerformanceReview.create({
        company_id: companyId,
        employee_id: formData.employee_id,
        employee_name: formData.employee_name,
        review_period: formData.review_period,
        review_type: formData.review_type,
        reviewer_id: currentUser.id,
        reviewer_name: currentUser.full_name || currentUser.email,
        review_date: new Date().toISOString(),
        competencies: formData.competencies,
        kpi_achievement: formData.kpi_achievement,
        overall_score: overallScore,
        rating: rating,
        strengths: formData.strengths.filter(s => s.trim()),
        areas_for_improvement: formData.areas_for_improvement.filter(a => a.trim()),
        development_plan: formData.development_plan.filter(p => p.goal.trim()),
        reviewer_comments: formData.reviewer_comments,
        employee_comments: formData.employee_comments,
        status: 'submitted'
      });

      toast.success('✅ Performance review berhasil dibuat');
      onSuccess();

    } catch (error) {
      console.error('Error creating review:', error);
      toast.error('Gagal membuat review');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedEmployee = employees.find(e => e.id === formData.employee_id);
  const selectedKPI = kpis.find(k => k.employee_id === formData.employee_id && k.period === formData.review_period);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-400" />
              Create Performance Review
            </div>
            <Button
              onClick={() => setShowAIHelper(!showAIHelper)}
              size="sm"
              variant="outline"
              className="border-purple-600 text-purple-400 hover:bg-purple-600/20"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {showAIHelper ? 'Hide' : 'Show'} AI Assistant
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-6">
          {/* Main Form - 2 columns */}
          <div className="col-span-2 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Employee *</Label>
                  <Select value={formData.employee_id} onValueChange={handleEmployeeChange}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-2">
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.user_name} - {emp.position}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-gray-300">Review Period *</Label>
                  <Input
                    type="month"
                    value={formData.review_period}
                    onChange={(e) => setFormData({...formData, review_period: e.target.value})}
                    className="bg-gray-800 border-gray-700 text-white mt-2"
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Review Type *</Label>
                  <Select value={formData.review_type} onValueChange={(v) => setFormData({...formData, review_type: v})}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      <SelectItem value="probation">Probation</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="mid_year">Mid Year</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.kpi_achievement.length > 0 && (
                  <div className="col-span-2">
                    <Badge className="bg-blue-600">
                      <LinkIcon className="w-3 h-3 mr-1" />
                      KPI Data Linked ({formData.kpi_achievement.length} metrics)
                    </Badge>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-white text-lg mb-3 block">Competencies Assessment</Label>
                {formData.competencies.map((comp, idx) => (
                  <Card key={idx} className="bg-gray-800 border-gray-700 mb-3">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-3 gap-3">
                        <Input
                          placeholder="Competency name"
                          value={comp.competency_name}
                          onChange={(e) => {
                            const updated = [...formData.competencies];
                            updated[idx].competency_name = e.target.value;
                            setFormData({...formData, competencies: updated});
                          }}
                          className="bg-gray-900 border-gray-600 text-white"
                        />
                        <Select
                          value={String(comp.score)}
                          onValueChange={(v) => {
                            const updated = [...formData.competencies];
                            updated[idx].score = Number(v);
                            setFormData({...formData, competencies: updated});
                          }}
                        >
                          <SelectTrigger className="bg-gray-900 border-gray-600 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-900 border-gray-700">
                            {[1,2,3,4,5].map(n => (
                              <SelectItem key={n} value={String(n)}>{n} - {['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][n-1]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Comments"
                          value={comp.comments}
                          onChange={(e) => {
                            const updated = [...formData.competencies];
                            updated[idx].comments = e.target.value;
                            setFormData({...formData, competencies: updated});
                          }}
                          className="bg-gray-900 border-gray-600 text-white"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setFormData({
                    ...formData,
                    competencies: [...formData.competencies, { competency_name: '', score: 3, comments: '' }]
                  })}
                  className="bg-blue-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Competency
                </Button>
              </div>

              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-semibold">Overall Score:</span>
                    <span className="text-3xl font-bold text-purple-400">{calculateOverallScore().toFixed(1)}/100</span>
                  </div>
                  <Badge className={`mt-2 ${
                    determineRating(calculateOverallScore()) === 'outstanding' ? 'bg-green-600' :
                    determineRating(calculateOverallScore()) === 'exceeds_expectations' ? 'bg-blue-600' :
                    determineRating(calculateOverallScore()) === 'meets_expectations' ? 'bg-purple-600' :
                    determineRating(calculateOverallScore()) === 'needs_improvement' ? 'bg-yellow-600' :
                    'bg-red-600'
                  }`}>
                    {determineRating(calculateOverallScore()).replace('_', ' ').toUpperCase()}
                  </Badge>
                </CardContent>
              </Card>

              <div>
                <Label className="text-gray-300">Reviewer Comments</Label>
                <Textarea
                  value={formData.reviewer_comments}
                  onChange={(e) => setFormData({...formData, reviewer_comments: e.target.value})}
                  className="bg-gray-800 border-gray-700 text-white mt-2"
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving} className="bg-purple-600">
                  {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Review
                </Button>
              </div>
            </form>
          </div>

          {/* ✅ AI Assistant Sidebar - 1 column */}
          {showAIHelper && formData.employee_id && (
            <div className="col-span-1">
              <ReviewAIHelper
                employee={selectedEmployee}
                kpiData={selectedKPI}
                onApplySuggestion={handleApplyAISuggestions}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
