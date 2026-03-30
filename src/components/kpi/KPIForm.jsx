import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function KPIForm({ employees, companyId, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    employee_id: '',
    employee_name: '',
    period: new Date().toISOString().slice(0, 7),
    metrics: [
      { name: 'Pencapaian Target', description: '', target: 100, actual: 0, unit: '%', weight: 30 }
    ],
    reviewer_notes: '',
    employee_notes: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const addMetric = () => {
    setFormData({
      ...formData,
      metrics: [
        ...formData.metrics,
        { name: '', description: '', target: 0, actual: 0, unit: '', weight: 0 }
      ]
    });
  };

  const removeMetric = (index) => {
    setFormData({
      ...formData,
      metrics: formData.metrics.filter((_, i) => i !== index)
    });
  };

  const updateMetric = (index, field, value) => {
    const updatedMetrics = [...formData.metrics];
    updatedMetrics[index] = {
      ...updatedMetrics[index],
      [field]: value
    };
    setFormData({ ...formData, metrics: updatedMetrics });
  };

  const calculateOverallScore = () => {
    let totalScore = 0;
    let totalWeight = 0;

    formData.metrics.forEach(metric => {
      const achievement = (metric.actual / metric.target) * 100;
      const weightedScore = achievement * (metric.weight / 100);
      totalScore += weightedScore;
      totalWeight += metric.weight;
    });

    return totalWeight > 0 ? Math.min(100, totalScore) : 0;
  };

  const determineRating = (score) => {
    if (score >= 90) return 'outstanding';
    if (score >= 80) return 'exceeds';
    if (score >= 70) return 'meets';
    if (score >= 50) return 'needs_improvement';
    return 'unsatisfactory';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.employee_id) {
      toast.error('Pilih karyawan terlebih dahulu');
      return;
    }

    if (formData.metrics.length === 0) {
      toast.error('Tambahkan minimal 1 metric');
      return;
    }

    const totalWeight = formData.metrics.reduce((sum, m) => sum + (m.weight || 0), 0);
    if (Math.abs(totalWeight - 100) > 0.1) {
      toast.error('Total weight harus = 100%');
      return;
    }

    try {
      setIsSaving(true);

      const overallScore = calculateOverallScore();
      const rating = determineRating(overallScore);

      await base44.entities.CompanyKPI.create({
        company_id: companyId,
        employee_id: formData.employee_id,
        employee_name: formData.employee_name,
        period: formData.period,
        metrics: formData.metrics,
        overall_score: overallScore,
        rating: rating,
        reviewer_notes: formData.reviewer_notes,
        employee_notes: formData.employee_notes,
        status: 'finalized'
      });

      toast.success('✅ KPI berhasil dibuat');
      onSuccess();

    } catch (error) {
      console.error('Error creating KPI:', error);
      toast.error('Gagal membuat KPI');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">Buat KPI Baru</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-300">Karyawan *</Label>
              <Select 
                value={formData.employee_id}
                onValueChange={(value) => {
                  const employee = employees.find(e => e.id === value);
                  setFormData({
                    ...formData,
                    employee_id: value,
                    employee_name: employee?.user_name || ''
                  });
                }}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-2">
                  <SelectValue placeholder="Pilih karyawan" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.user_name} - {emp.position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-gray-300">Periode *</Label>
              <Input
                type="month"
                value={formData.period}
                onChange={(e) => setFormData({...formData, period: e.target.value})}
                className="bg-gray-800 border-gray-700 text-white mt-2"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-white text-lg">Metrics</Label>
              <Button type="button" size="sm" onClick={addMetric} className="bg-blue-600">
                <Plus className="w-4 h-4 mr-2" />
                Add Metric
              </Button>
            </div>

            {formData.metrics.map((metric, index) => (
              <Card key={index} className="bg-gray-800 border-gray-700">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <h4 className="text-white font-semibold">Metric #{index + 1}</h4>
                    {formData.metrics.length > 1 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeMetric(index)}
                        className="text-red-400 hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-gray-300 text-sm">Nama Metric</Label>
                      <Input
                        value={metric.name}
                        onChange={(e) => updateMetric(index, 'name', e.target.value)}
                        className="bg-gray-900 border-gray-600 text-white mt-1"
                        placeholder="e.g., Sales Target"
                      />
                    </div>

                    <div>
                      <Label className="text-gray-300 text-sm">Unit</Label>
                      <Input
                        value={metric.unit}
                        onChange={(e) => updateMetric(index, 'unit', e.target.value)}
                        className="bg-gray-900 border-gray-600 text-white mt-1"
                        placeholder="e.g., Rp, unit, %"
                      />
                    </div>

                    <div>
                      <Label className="text-gray-300 text-sm">Target</Label>
                      <Input
                        type="number"
                        value={metric.target}
                        onChange={(e) => updateMetric(index, 'target', Number(e.target.value))}
                        className="bg-gray-900 border-gray-600 text-white mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-gray-300 text-sm">Actual</Label>
                      <Input
                        type="number"
                        value={metric.actual}
                        onChange={(e) => updateMetric(index, 'actual', Number(e.target.value))}
                        className="bg-gray-900 border-gray-600 text-white mt-1"
                      />
                    </div>

                    <div className="col-span-2">
                      <Label className="text-gray-300 text-sm">Weight (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={metric.weight}
                        onChange={(e) => updateMetric(index, 'weight', Number(e.target.value))}
                        className="bg-gray-900 border-gray-600 text-white mt-1"
                      />
                    </div>
                  </div>

                  <div className="bg-gray-900 p-2 rounded text-xs text-gray-400">
                    Achievement: {metric.target > 0 ? ((metric.actual / metric.target) * 100).toFixed(1) : 0}%
                  </div>
                </CardContent>
              </Card>
            ))}

            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-white font-semibold">Total Weight:</span>
                <span className={`text-lg font-bold ${
                  Math.abs(formData.metrics.reduce((sum, m) => sum + (m.weight || 0), 0) - 100) < 0.1 
                    ? 'text-green-400' 
                    : 'text-red-400'
                }`}>
                  {formData.metrics.reduce((sum, m) => sum + (m.weight || 0), 0)}%
                </span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-white font-semibold">Overall Score:</span>
                <span className="text-2xl font-bold text-blue-400">
                  {calculateOverallScore().toFixed(1)}/100
                </span>
              </div>
              <Badge className={
                determineRating(calculateOverallScore()) === 'outstanding' ? 'bg-green-600 mt-2' :
                determineRating(calculateOverallScore()) === 'exceeds' ? 'bg-blue-600 mt-2' :
                determineRating(calculateOverallScore()) === 'meets' ? 'bg-purple-600 mt-2' :
                determineRating(calculateOverallScore()) === 'needs_improvement' ? 'bg-yellow-600 mt-2' :
                'bg-red-600 mt-2'
              }>
                {determineRating(calculateOverallScore()).replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
          </div>

          <div>
            <Label className="text-gray-300">Catatan Reviewer</Label>
            <Textarea
              value={formData.reviewer_notes}
              onChange={(e) => setFormData({...formData, reviewer_notes: e.target.value})}
              className="bg-gray-800 border-gray-700 text-white mt-2"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving} className="border-gray-700">
              Batal
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-green-600 hover:bg-green-700">
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Simpan KPI
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}