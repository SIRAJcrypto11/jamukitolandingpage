import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Sparkles,
  TrendingDown,
  AlertTriangle,
  Info,
  Lightbulb,
  Loader2,
  DollarSign,
  Users,
  TrendingUp,
  Calculator
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * PayrollAIAssistant - AI-powered payroll insights
 * Features:
 * - Cost-saving opportunities
 * - Anomaly detection
 * - Payroll calculation explainer
 */
export default function PayrollAIAssistant({ payrolls, employees, config, company }) {
  const [insights, setInsights] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [isExplaining, setIsExplaining] = useState(false);

  useEffect(() => {
    if (payrolls && payrolls.length > 0) {
      analyzePayrollData();
    }
  }, [payrolls]);

  const analyzePayrollData = async () => {
    try {
      setIsAnalyzing(true);

      const totalPayroll = payrolls.reduce((sum, p) => sum + (p.net_salary || 0), 0);
      const totalOvertimePay = payrolls.reduce((sum, p) => sum + (p.overtime_pay || 0), 0);
      const totalKPIBonus = payrolls.reduce((sum, p) => sum + (p.kpi_bonus || 0), 0);
      const avgSalary = totalPayroll / payrolls.length;
      const avgOvertimeHours = payrolls.reduce((sum, p) => sum + (p.overtime_hours || 0), 0) / payrolls.length;

      const generatedInsights = [];

      // ✅ COST-SAVING: High overtime detection
      if (totalOvertimePay > totalPayroll * 0.15) {
        const savingPotential = totalOvertimePay * 0.3; // Assume 30% can be reduced
        generatedInsights.push({
          type: 'cost_saving',
          severity: 'high',
          title: 'Overtime Cost Tinggi',
          message: `Total overtime pay sebesar Rp ${totalOvertimePay.toLocaleString('id-ID')} (${((totalOvertimePay/totalPayroll)*100).toFixed(1)}% dari total payroll). Pertimbangkan:`,
          suggestions: [
            `Optimalkan shift scheduling untuk mengurangi overtime`,
            `Hiring karyawan baru untuk distribusi workload lebih baik`,
            `Review workload per department`,
            `Potensi saving: Rp ${savingPotential.toLocaleString('id-ID')}/bulan`
          ],
          icon: TrendingDown,
          color: 'yellow'
        });
      }

      // ✅ COST-SAVING: BPJS optimization
      if (config && config.bpjs_kesehatan) {
        const currentBPJSRate = config.bpjs_kesehatan.company_contribution;
        if (currentBPJSRate > 4) {
          generatedInsights.push({
            type: 'cost_saving',
            severity: 'medium',
            title: 'BPJS Configuration Suboptimal',
            message: `BPJS Kesehatan company contribution saat ini ${currentBPJSRate}%. Standard adalah 4%.`,
            suggestions: [
              'Review konfigurasi BPJS dengan HR',
              'Pastikan sesuai dengan regulasi pemerintah',
              'Potensi saving jika dikurangi ke 4%'
            ],
            icon: DollarSign,
            color: 'blue'
          });
        }
      }

      // ✅ ANOMALY DETECTION: Salary outliers
      const salaries = payrolls.map(p => p.net_salary || 0);
      const maxSalary = Math.max(...salaries);
      const minSalary = Math.min(...salaries);
      if (maxSalary > avgSalary * 3) {
        const outlier = payrolls.find(p => p.net_salary === maxSalary);
        generatedInsights.push({
          type: 'anomaly',
          severity: 'medium',
          title: 'Salary Outlier Detected',
          message: `${outlier.employee_name} memiliki gaji Rp ${maxSalary.toLocaleString('id-ID')}, 3x lipat dari rata-rata.`,
          suggestions: [
            'Verifikasi apakah data payroll correct',
            'Check jika ada overtime atau bonus yang tidak biasa',
            'Review job level dan salary structure'
          ],
          icon: AlertTriangle,
          color: 'red'
        });
      }

      // ✅ ANOMALY: Zero attendance but full salary
      const zeroAttendance = payrolls.filter(p => p.attendance_days === 0 && p.net_salary > 0);
      if (zeroAttendance.length > 0) {
        generatedInsights.push({
          type: 'anomaly',
          severity: 'high',
          title: 'Attendance Data Anomaly',
          message: `${zeroAttendance.length} karyawan dengan attendance 0 hari tapi tetap menerima gaji.`,
          suggestions: [
            'Verifikasi attendance records',
            'Check apakah karyawan sedang cuti',
            'Review payroll calculation formula',
            `Affected: ${zeroAttendance.map(p => p.employee_name).join(', ')}`
          ],
          icon: AlertTriangle,
          color: 'red'
        });
      }

      // ✅ INSIGHT: KPI Impact on Payroll
      if (totalKPIBonus > 0) {
        generatedInsights.push({
          type: 'insight',
          severity: 'low',
          title: 'KPI Bonus Impact',
          message: `Total KPI bonus: Rp ${totalKPIBonus.toLocaleString('id-ID')} (${((totalKPIBonus/totalPayroll)*100).toFixed(1)}% dari payroll)`,
          suggestions: [
            `${payrolls.filter(p => (p.kpi_bonus || 0) > 0).length} karyawan menerima KPI bonus`,
            'KPI bonus meningkatkan employee motivation',
            'Review apakah bonus allocation sesuai performance'
          ],
          icon: TrendingUp,
          color: 'green'
        });
      }

      // ✅ COST-SAVING: Tax optimization suggestion
      const totalTax = payrolls.reduce((sum, p) => sum + (p.tax_amount || 0), 0);
      if (totalTax > 0) {
        generatedInsights.push({
          type: 'insight',
          severity: 'low',
          title: 'Tax Optimization',
          message: `Total PPh 21: Rp ${totalTax.toLocaleString('id-ID')}`,
          suggestions: [
            'Pastikan PTKP (Penghasilan Tidak Kena Pajak) sudah optimal',
            'Review apakah ada allowances yang bisa non-taxable',
            'Konsultasi dengan tax advisor untuk maksimalisasi efisiensi'
          ],
          icon: Calculator,
          color: 'purple'
        });
      }

      setInsights(generatedInsights);

    } catch (error) {
      console.error('Error analyzing payroll:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const explainPayrollCalculation = async (payroll) => {
    try {
      setIsExplaining(true);
      setSelectedPayroll(payroll);

      // ✅ AI-POWERED EXPLANATION
      const prompt = `Jelaskan secara sederhana dan mudah dipahami tentang perhitungan gaji berikut untuk karyawan:

**Data Payroll:**
- Nama: ${payroll.employee_name}
- Periode: ${payroll.period}
- Gaji Pokok: Rp ${(payroll.basic_salary || 0).toLocaleString('id-ID')}
- Overtime: ${payroll.overtime_hours || 0} jam (Rp ${(payroll.overtime_pay || 0).toLocaleString('id-ID')})
- KPI Bonus: Rp ${(payroll.kpi_bonus || 0).toLocaleString('id-ID')} (KPI Score: ${payroll.kpi_score || 0})
- Gross Salary: Rp ${(payroll.gross_salary || 0).toLocaleString('id-ID')}
- Potongan:
${(payroll.deductions || []).map(d => `  * ${d.name}: Rp ${(d.amount || 0).toLocaleString('id-ID')}`).join('\n')}
- Net Salary (Take Home Pay): Rp ${(payroll.net_salary || 0).toLocaleString('id-ID')}

**BPJS Info:**
- BPJS Kesehatan (Karyawan): Rp ${(payroll.bpjs_kesehatan_employee || 0).toLocaleString('id-ID')}
- BPJS Ketenagakerjaan (Karyawan): Rp ${(payroll.bpjs_tk_employee || 0).toLocaleString('id-ID')}
- PPh 21: Rp ${(payroll.tax_amount || 0).toLocaleString('id-ID')}

**Attendance:**
- Hadir: ${payroll.attendance_days}/${payroll.working_days} hari
- Terlambat: ${payroll.late_count || 0} hari

Jelaskan dalam bahasa Indonesia yang mudah dipahami:
1. Bagaimana gross salary dihitung (gaji pokok + overtime + bonus)
2. Apa saja potongan dan kenapa dikenakan
3. Bagaimana perhitungan BPJS (employer & employee contribution)
4. Bagaimana perhitungan PPh 21
5. Mengapa net salary berbeda dari gross salary

Format dalam paragraf yang jelas dan berikan contoh perhitungan.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: false
      });

      setExplanation(response);

    } catch (error) {
      console.error('Error explaining payroll:', error);
      toast.error('Gagal generate explanation');
    } finally {
      setIsExplaining(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'high': return 'bg-red-100 border-red-300 text-red-800';
      case 'medium': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'low': return 'bg-blue-100 border-blue-300 text-blue-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getIconColor = (color) => {
    switch(color) {
      case 'red': return 'text-red-500';
      case 'yellow': return 'text-yellow-500';
      case 'green': return 'text-green-500';
      case 'blue': return 'text-blue-500';
      case 'purple': return 'text-purple-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="space-y-4">
      {/* AI Insights */}
      <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            AI Payroll Insights
            {isAnalyzing && <Loader2 className="w-4 h-4 animate-spin ml-auto" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {insights.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Lightbulb className="w-12 h-12 mx-auto mb-3 text-gray-500" />
              <p>Analyzing payroll data...</p>
              {isAnalyzing && <Loader2 className="w-6 h-6 animate-spin mx-auto mt-3" />}
            </div>
          ) : (
            insights.map((insight, idx) => {
              const Icon = insight.icon;
              return (
                <Alert key={idx} className={getSeverityColor(insight.severity)}>
                  <Icon className={`h-5 w-5 ${getIconColor(insight.color)}`} />
                  <AlertDescription>
                    <div>
                      <p className="font-semibold mb-2">{insight.title}</p>
                      <p className="text-sm mb-2">{insight.message}</p>
                      {insight.suggestions && insight.suggestions.length > 0 && (
                        <ul className="text-sm space-y-1 mt-2 ml-4">
                          {insight.suggestions.map((suggestion, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-xs mt-1">•</span>
                              <span>{suggestion}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              );
            })
          )}

          <Button
            onClick={analyzePayrollData}
            disabled={isAnalyzing}
            variant="outline"
            className="w-full border-purple-600 text-purple-400 hover:bg-purple-600/20"
          >
            {isAnalyzing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> Re-Analyze Payroll</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* AI Explainer */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-400" />
            Payroll Calculator Explainer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm text-gray-400 mb-2 block">
              Pilih karyawan untuk penjelasan detail:
            </label>
            <select
              value={selectedPayroll?.id || ''}
              onChange={(e) => {
                const p = payrolls.find(pay => pay.id === e.target.value);
                if (p) explainPayrollCalculation(p);
              }}
              className="w-full bg-gray-800 border-gray-700 text-white rounded-lg px-3 py-2"
            >
              <option value="">-- Pilih Karyawan --</option>
              {payrolls.map(p => (
                <option key={p.id} value={p.id}>
                  {p.employee_name} - Rp {(p.net_salary || 0).toLocaleString('id-ID')}
                </option>
              ))}
            </select>
          </div>

          {isExplaining && (
            <div className="text-center py-4">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto" />
              <p className="text-sm text-gray-400 mt-2">AI sedang generate penjelasan...</p>
            </div>
          )}

          {explanation && !isExplaining && (
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <p className="text-sm font-semibold text-white">AI Explanation:</p>
              </div>
              <div className="text-sm text-gray-300 whitespace-pre-line leading-relaxed">
                {explanation}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400">Total Overtime</p>
            <p className="text-lg font-bold text-yellow-400">
              {payrolls.reduce((sum, p) => sum + (p.overtime_hours || 0), 0).toFixed(1)}h
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400">Total Tax</p>
            <p className="text-lg font-bold text-purple-400">
              Rp {(payrolls.reduce((sum, p) => sum + (p.tax_amount || 0), 0) / 1000000).toFixed(1)}M
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400">Total BPJS</p>
            <p className="text-lg font-bold text-green-400">
              Rp {(payrolls.reduce((sum, p) => 
                sum + (p.bpjs_kesehatan_employee || 0) + (p.bpjs_tk_employee || 0), 0
              ) / 1000000).toFixed(1)}M
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}