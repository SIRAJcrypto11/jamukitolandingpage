import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Zap, 
  RefreshCw, 
  Loader2,
  DollarSign,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth } from 'date-fns';
import { id } from 'date-fns/locale';

/**
 * RealtimePayrollCalculator - Calculate payroll ANYTIME, not just end of month
 * Updates in realtime as attendance/KPI data changes
 */
export default function RealtimePayrollCalculator({ employees, companyId, config }) {
  const [realtimePayrolls, setRealtimePayrolls] = useState([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(format(new Date(), 'yyyy-MM'));

  useEffect(() => {
    if (companyId && employees.length > 0) {
      calculateRealtimePayroll();
    }
  }, [companyId, employees, selectedPeriod]);

  const calculateRealtimePayroll = async () => {
    try {
      setIsCalculating(true);

      const startDate = startOfMonth(new Date(selectedPeriod));
      const endDate = new Date(); // ✅ SAMPAI HARI INI, bukan end of month

      const payrollConfig = config || {
        working_hours_per_day: 8,
        working_days_per_month: 22,
        overtime_rate: 1.5,
        kpi_bonus_enabled: true,
        kpi_bonus_formula: {
          outstanding: 20,
          exceeds: 15,
          meets: 10,
          needs_improvement: 5,
          unsatisfactory: 0
        },
        tax_formula: {
          ptkp: 54000000,
          brackets: [
            { min: 0, max: 60000000, rate: 5 },
            { min: 60000000, max: 250000000, rate: 15 },
            { min: 250000000, max: 500000000, rate: 25 },
            { min: 500000000, max: 999999999999, rate: 30 }
          ]
        }
      };

      // ✅ LOAD REALTIME DATA
      const [attendanceData, kpiData] = await Promise.all([
        base44.entities.CompanyAttendance.filter({
          company_id: companyId,
          date: {
            $gte: format(startDate, 'yyyy-MM-dd'),
            $lte: format(endDate, 'yyyy-MM-dd')
          }
        }),
        base44.entities.CompanyKPI.filter({
          company_id: companyId,
          period: selectedPeriod
        })
      ]);

      const calculated = [];

      for (const employee of employees) {
        const employeeAttendance = attendanceData.filter(
          a => a.employee_email === employee.user_email
        );

        const employeeKPI = kpiData.find(k => k.employee_id === employee.id);

        const presentDays = employeeAttendance.filter(
          a => a.status === 'present' || a.status === 'late'
        ).length;
        const lateDays = employeeAttendance.filter(a => a.status === 'late').length;
        const totalHours = employeeAttendance.reduce((sum, a) => sum + (a.total_hours || 0), 0);

        // ✅ PRORATED CALCULATION - based on days worked so far
        const daysInMonth = new Date(
          new Date(selectedPeriod).getFullYear(),
          new Date(selectedPeriod).getMonth() + 1,
          0
        ).getDate();

        const currentDay = new Date().getDate();
        const workingDaysSoFar = Math.min(currentDay, daysInMonth);
        const expectedDays = workingDaysSoFar;

        const basicSalary = employee.salary || 0;
        
        // ✅ PRORATED SALARY - based on days worked
        const dailyRate = basicSalary / payrollConfig.working_days_per_month;
        const proratedBasicSalary = dailyRate * presentDays;

        const expectedHours = presentDays * payrollConfig.working_hours_per_day;
        const overtimeHours = Math.max(0, totalHours - expectedHours);
        const hourlyRate = dailyRate / payrollConfig.working_hours_per_day;
        const overtimePay = overtimeHours * hourlyRate * payrollConfig.overtime_rate;

        // KPI Bonus
        let kpiBonus = 0;
        if (payrollConfig.kpi_bonus_enabled && employeeKPI) {
          const bonusPercentage = payrollConfig.kpi_bonus_formula[employeeKPI.rating] || 0;
          kpiBonus = proratedBasicSalary * (bonusPercentage / 100);
        }

        const grossSalary = proratedBasicSalary + overtimePay + kpiBonus;

        // Tax & BPJS (simplified for realtime)
        const bpjsKesehatan = (proratedBasicSalary * 1) / 100;
        const bpjsKetenagakerjaan = (proratedBasicSalary * 3) / 100;
        const estimatedTax = (grossSalary * 5) / 100; // Simplified

        const totalDeductions = bpjsKesehatan + bpjsKetenagakerjaan + estimatedTax;
        const netSalary = grossSalary - totalDeductions;

        calculated.push({
          employee_id: employee.id,
          employee_name: employee.user_name,
          attendance_days: presentDays,
          expected_days: expectedDays,
          late_count: lateDays,
          overtime_hours: overtimeHours,
          basic_salary: proratedBasicSalary,
          overtime_pay: overtimePay,
          kpi_bonus: kpiBonus,
          kpi_score: employeeKPI?.overall_score || 0,
          gross_salary: grossSalary,
          net_salary: netSalary,
          is_realtime: true,
          days_worked_so_far: presentDays,
          projection_full_month: (netSalary / presentDays) * payrollConfig.working_days_per_month
        });
      }

      setRealtimePayrolls(calculated);
      setLastUpdated(new Date());

    } catch (error) {
      console.error('Error calculating realtime payroll:', error);
      toast.error('Gagal calculate payroll');
    } finally {
      setIsCalculating(false);
    }
  };

  const saveRealtimeAsPayroll = async () => {
    if (!confirm('Simpan perhitungan realtime ini sebagai payroll official?')) return;

    try {
      for (const payroll of realtimePayrolls) {
        const deductions = [
          { name: 'BPJS Kesehatan', amount: (payroll.basic_salary * 1) / 100 },
          { name: 'BPJS Ketenagakerjaan', amount: (payroll.basic_salary * 3) / 100 },
          { name: 'PPh 21 (Estimated)', amount: (payroll.gross_salary * 5) / 100 }
        ];

        await base44.entities.CompanyPayroll.create({
          company_id: companyId,
          employee_id: payroll.employee_id,
          employee_name: payroll.employee_name,
          period: selectedPeriod,
          basic_salary: payroll.basic_salary,
          attendance_days: payroll.attendance_days,
          working_days: payroll.expected_days,
          late_count: payroll.late_count,
          overtime_hours: payroll.overtime_hours,
          overtime_pay: payroll.overtime_pay,
          kpi_bonus: payroll.kpi_bonus,
          kpi_score: payroll.kpi_score,
          gross_salary: payroll.gross_salary,
          deductions: deductions,
          net_salary: payroll.net_salary,
          status: 'draft'
        });
      }

      toast.success('✅ Payroll berhasil disimpan!');

    } catch (error) {
      console.error('Error saving payroll:', error);
      toast.error('Gagal menyimpan payroll');
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-green-900/20 to-blue-900/20 border-green-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              Realtime Payroll Calculator
              <Badge className="bg-green-600 animate-pulse">LIVE</Badge>
            </CardTitle>
            <div className="flex gap-2 items-center">
              {lastUpdated && (
                <span className="text-xs text-gray-400">
                  Updated: {format(lastUpdated, 'HH:mm:ss')}
                </span>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={calculateRealtimePayroll}
                disabled={isCalculating}
                className="border-green-600 text-green-400"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isCalculating ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
          <p className="text-sm text-gray-400 mt-2">
            💡 Payroll dihitung REALTIME berdasarkan data hari ini - tidak perlu tunggu akhir bulan!
          </p>
        </CardHeader>
        <CardContent>
          {isCalculating ? (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-green-400 mx-auto mb-3" />
              <p className="text-gray-400">Calculating realtime payroll...</p>
            </div>
          ) : realtimePayrolls.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              <p>No payroll data</p>
            </div>
          ) : (
            <div className="space-y-3">
              {realtimePayrolls.map((payroll) => (
                <div key={payroll.employee_id} className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <p className="font-semibold text-white mb-2">{payroll.employee_name}</p>
                      <div className="grid grid-cols-4 gap-3 text-xs">
                        <div>
                          <p className="text-gray-400">Hadir</p>
                          <p className="text-white font-semibold">
                            {payroll.attendance_days} / {payroll.expected_days} hari
                          </p>
                          <Progress 
                            value={(payroll.attendance_days / payroll.expected_days) * 100} 
                            className="mt-1 h-1"
                          />
                        </div>
                        <div>
                          <p className="text-gray-400">Overtime</p>
                          <p className="text-yellow-400 font-semibold">
                            {payroll.overtime_hours.toFixed(1)} jam
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400">KPI Score</p>
                          <p className="text-purple-400 font-semibold">
                            {payroll.kpi_score.toFixed(1)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400">Late</p>
                          <p className="text-red-400 font-semibold">
                            {payroll.late_count} hari
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t border-gray-700">
                    <div>
                      <p className="text-xs text-gray-400">Gross Salary (YTD)</p>
                      <p className="text-white font-bold">
                        Rp {payroll.gross_salary.toLocaleString('id-ID')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Net Salary (YTD)</p>
                      <p className="text-green-400 font-bold">
                        Rp {payroll.net_salary.toLocaleString('id-ID')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Projected (Full Month)</p>
                      <p className="text-blue-400 font-bold">
                        Rp {(payroll.projection_full_month || 0).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 p-2 bg-green-900/20 rounded border border-green-700">
                    <p className="text-xs text-green-400">
                      ✅ Realtime: Dihitung s/d hari ini ({format(new Date(), 'dd MMM yyyy', { locale: id })})
                    </p>
                  </div>
                </div>
              ))}

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  onClick={saveRealtimeAsPayroll}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Simpan sebagai Payroll Official
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Summary */}
      {realtimePayrolls.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-4">
              <p className="text-xs text-gray-400">Total Gross (YTD)</p>
              <p className="text-xl font-bold text-white">
                Rp {(realtimePayrolls.reduce((sum, p) => sum + p.gross_salary, 0) / 1000000).toFixed(1)}M
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-4">
              <p className="text-xs text-gray-400">Total Net (YTD)</p>
              <p className="text-xl font-bold text-green-400">
                Rp {(realtimePayrolls.reduce((sum, p) => sum + p.net_salary, 0) / 1000000).toFixed(1)}M
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-4">
              <p className="text-xs text-gray-400">Projected (Full Month)</p>
              <p className="text-xl font-bold text-blue-400">
                Rp {(realtimePayrolls.reduce((sum, p) => sum + (p.projection_full_month || 0), 0) / 1000000).toFixed(1)}M
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-4">
              <p className="text-xs text-gray-400">Avg Attendance</p>
              <p className="text-xl font-bold text-purple-400">
                {realtimePayrolls.length > 0 ? 
                  (realtimePayrolls.reduce((sum, p) => sum + ((p.attendance_days / p.expected_days) * 100), 0) / realtimePayrolls.length).toFixed(1)
                : 0}%
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}