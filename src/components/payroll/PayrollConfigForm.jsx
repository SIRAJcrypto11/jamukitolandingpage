import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, Settings } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Payroll Configuration Form
 * For company owner to customize payroll calculation rules
 */
export default function PayrollConfigForm({ company, currentUser }) {
  const [config, setConfig] = useState({
    basic_salary_formula: 'fixed',
    working_hours_per_day: 8,
    working_days_per_month: 22,
    overtime_rate: 1.5,
    late_penalty_per_minute: 0,
    absence_deduction_per_day: 0,
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
    },
    bpjs_kesehatan: {
      company_contribution: 4,
      employee_contribution: 1
    },
    bpjs_ketenagakerjaan: {
      jht_company: 3.7,
      jht_employee: 2,
      jkk: 0.24,
      jkm: 0.3,
      jp_company: 2,
      jp_employee: 1
    },
    auto_generate: false,
    payment_date: 25
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (company) {
      loadConfig();
    }
  }, [company]);

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const configs = await base44.entities.PayrollConfiguration.filter({
        company_id: company.id
      });

      if (configs && configs.length > 0) {
        setConfig(configs[0]);
      }
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // Check if config exists
      const existing = await base44.entities.PayrollConfiguration.filter({
        company_id: company.id
      });

      if (existing && existing.length > 0) {
        // Update existing
        await base44.entities.PayrollConfiguration.update(existing[0].id, {
          ...config,
          company_id: company.id
        });
      } else {
        // Create new
        await base44.entities.PayrollConfiguration.create({
          ...config,
          company_id: company.id
        });
      }

      toast.success('✅ Konfigurasi payroll berhasil disimpan');
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Gagal menyimpan konfigurasi');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="p-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-400" />
          Konfigurasi Payroll - {company.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Pengaturan Dasar</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-300">Formula Gaji Dasar</Label>
              <select
                value={config.basic_salary_formula}
                onChange={(e) => setConfig({...config, basic_salary_formula: e.target.value})}
                className="w-full mt-2 bg-gray-800 border-gray-700 text-white rounded-lg px-3 py-2"
              >
                <option value="fixed">Fixed (Bulanan)</option>
                <option value="hourly">Per Jam</option>
                <option value="daily">Per Hari</option>
              </select>
            </div>

            <div>
              <Label className="text-gray-300">Jam Kerja per Hari</Label>
              <Input
                type="number"
                value={config.working_hours_per_day}
                onChange={(e) => setConfig({...config, working_hours_per_day: Number(e.target.value)})}
                className="bg-gray-800 border-gray-700 text-white mt-2"
              />
            </div>

            <div>
              <Label className="text-gray-300">Hari Kerja per Bulan</Label>
              <Input
                type="number"
                value={config.working_days_per_month}
                onChange={(e) => setConfig({...config, working_days_per_month: Number(e.target.value)})}
                className="bg-gray-800 border-gray-700 text-white mt-2"
              />
            </div>

            <div>
              <Label className="text-gray-300">Tanggal Pembayaran Gaji</Label>
              <Input
                type="number"
                min="1"
                max="31"
                value={config.payment_date}
                onChange={(e) => setConfig({...config, payment_date: Number(e.target.value)})}
                className="bg-gray-800 border-gray-700 text-white mt-2"
              />
            </div>
          </div>
        </div>

        {/* Overtime Settings */}
        <div className="space-y-4 pt-4 border-t border-gray-700">
          <h3 className="text-lg font-semibold text-white">Lembur & Keterlambatan</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-300">Rate Lembur (x gaji/jam)</Label>
              <Input
                type="number"
                step="0.1"
                value={config.overtime_rate}
                onChange={(e) => setConfig({...config, overtime_rate: Number(e.target.value)})}
                className="bg-gray-800 border-gray-700 text-white mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">Default: 1.5 (150% dari gaji per jam)</p>
            </div>

            <div>
              <Label className="text-gray-300">Penalty Telat (Rp/menit)</Label>
              <Input
                type="number"
                value={config.late_penalty_per_minute}
                onChange={(e) => setConfig({...config, late_penalty_per_minute: Number(e.target.value)})}
                className="bg-gray-800 border-gray-700 text-white mt-2"
              />
            </div>

            <div>
              <Label className="text-gray-300">Potongan Absen (Rp/hari)</Label>
              <Input
                type="number"
                value={config.absence_deduction_per_day}
                onChange={(e) => setConfig({...config, absence_deduction_per_day: Number(e.target.value)})}
                className="bg-gray-800 border-gray-700 text-white mt-2"
              />
            </div>
          </div>
        </div>

        {/* KPI Bonus */}
        <div className="space-y-4 pt-4 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Bonus Berdasarkan KPI</h3>
            <Switch
              checked={config.kpi_bonus_enabled}
              onCheckedChange={(value) => setConfig({...config, kpi_bonus_enabled: value})}
            />
          </div>
          
          {config.kpi_bonus_enabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Outstanding (%)</Label>
                <Input
                  type="number"
                  value={config.kpi_bonus_formula.outstanding}
                  onChange={(e) => setConfig({
                    ...config,
                    kpi_bonus_formula: {...config.kpi_bonus_formula, outstanding: Number(e.target.value)}
                  })}
                  className="bg-gray-800 border-gray-700 text-white mt-2"
                />
              </div>
              <div>
                <Label className="text-gray-300">Exceeds (%)</Label>
                <Input
                  type="number"
                  value={config.kpi_bonus_formula.exceeds}
                  onChange={(e) => setConfig({
                    ...config,
                    kpi_bonus_formula: {...config.kpi_bonus_formula, exceeds: Number(e.target.value)}
                  })}
                  className="bg-gray-800 border-gray-700 text-white mt-2"
                />
              </div>
              <div>
                <Label className="text-gray-300">Meets (%)</Label>
                <Input
                  type="number"
                  value={config.kpi_bonus_formula.meets}
                  onChange={(e) => setConfig({
                    ...config,
                    kpi_bonus_formula: {...config.kpi_bonus_formula, meets: Number(e.target.value)}
                  })}
                  className="bg-gray-800 border-gray-700 text-white mt-2"
                />
              </div>
              <div>
                <Label className="text-gray-300">Needs Improvement (%)</Label>
                <Input
                  type="number"
                  value={config.kpi_bonus_formula.needs_improvement}
                  onChange={(e) => setConfig({
                    ...config,
                    kpi_bonus_formula: {...config.kpi_bonus_formula, needs_improvement: Number(e.target.value)}
                  })}
                  className="bg-gray-800 border-gray-700 text-white mt-2"
                />
              </div>
            </div>
          )}
        </div>

        {/* BPJS */}
        <div className="space-y-4 pt-4 border-t border-gray-700">
          <h3 className="text-lg font-semibold text-white">BPJS Kesehatan (%)</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-300">Kontribusi Perusahaan</Label>
              <Input
                type="number"
                step="0.1"
                value={config.bpjs_kesehatan.company_contribution}
                onChange={(e) => setConfig({
                  ...config,
                  bpjs_kesehatan: {...config.bpjs_kesehatan, company_contribution: Number(e.target.value)}
                })}
                className="bg-gray-800 border-gray-700 text-white mt-2"
              />
            </div>
            <div>
              <Label className="text-gray-300">Kontribusi Karyawan</Label>
              <Input
                type="number"
                step="0.1"
                value={config.bpjs_kesehatan.employee_contribution}
                onChange={(e) => setConfig({
                  ...config,
                  bpjs_kesehatan: {...config.bpjs_kesehatan, employee_contribution: Number(e.target.value)}
                })}
                className="bg-gray-800 border-gray-700 text-white mt-2"
              />
            </div>
          </div>
        </div>

        {/* Auto Generation */}
        <div className="space-y-4 pt-4 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Auto-Generate Payroll</h3>
              <p className="text-sm text-gray-400">Otomatis buat payroll setiap akhir bulan</p>
            </div>
            <Switch
              checked={config.auto_generate}
              onCheckedChange={(value) => setConfig({...config, auto_generate: value})}
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-6 border-t border-gray-700">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Simpan Konfigurasi
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}