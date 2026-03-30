import React, { useState, useEffect } from 'react';
import { Payroll } from '@/entities/Payroll';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function PayrollForm({ employees, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    employee_id: '',
    employee_name: '',
    period: new Date().toISOString().slice(0, 7),
    basic_salary: 0,
    allowances: [],
    deductions: [],
    overtime_hours: 0,
    overtime_pay: 0,
    payment_method: 'bank_transfer',
    notes: ''
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    calculateTotals();
  }, [formData.basic_salary, formData.allowances, formData.deductions, formData.overtime_pay]);

  const calculateTotals = () => {
    const totalAllowances = formData.allowances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
    const totalDeductions = formData.deductions.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
    const grossSalary = Number(formData.basic_salary) + totalAllowances + Number(formData.overtime_pay);
    const netSalary = grossSalary - totalDeductions;

    setFormData(prev => ({
      ...prev,
      gross_salary: grossSalary,
      net_salary: netSalary
    }));
  };

  const addAllowance = () => {
    setFormData({
      ...formData,
      allowances: [...formData.allowances, { name: '', amount: 0 }]
    });
  };

  const removeAllowance = (index) => {
    const newAllowances = formData.allowances.filter((_, i) => i !== index);
    setFormData({ ...formData, allowances: newAllowances });
  };

  const updateAllowance = (index, field, value) => {
    const newAllowances = [...formData.allowances];
    newAllowances[index][field] = field === 'amount' ? Number(value) : value;
    setFormData({ ...formData, allowances: newAllowances });
  };

  const addDeduction = () => {
    setFormData({
      ...formData,
      deductions: [...formData.deductions, { name: '', amount: 0 }]
    });
  };

  const removeDeduction = (index) => {
    const newDeductions = formData.deductions.filter((_, i) => i !== index);
    setFormData({ ...formData, deductions: newDeductions });
  };

  const updateDeduction = (index, field, value) => {
    const newDeductions = [...formData.deductions];
    newDeductions[index][field] = field === 'amount' ? Number(value) : value;
    setFormData({ ...formData, deductions: newDeductions });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await Payroll.create({
        ...formData,
        status: 'draft'
      });
      toast.success('Payroll berhasil dibuat');
      onSuccess();
    } catch (error) {
      console.error('Error creating payroll:', error);
      toast.error('Gagal membuat payroll');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Karyawan *</Label>
          <Select 
            value={formData.employee_id}
            onValueChange={(value) => {
              const emp = employees.find(e => e.id === value);
              setFormData({
                ...formData,
                employee_id: value,
                employee_name: emp?.full_name || '',
                basic_salary: emp?.salary || 0
              });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih karyawan" />
            </SelectTrigger>
            <SelectContent>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.full_name} - {emp.position}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Periode *</Label>
          <Input
            type="month"
            value={formData.period}
            onChange={(e) => setFormData({...formData, period: e.target.value})}
            required
          />
        </div>

        <div>
          <Label>Gaji Pokok *</Label>
          <Input
            type="number"
            value={formData.basic_salary}
            onChange={(e) => setFormData({...formData, basic_salary: Number(e.target.value)})}
            required
          />
        </div>

        <div>
          <Label>Metode Pembayaran</Label>
          <Select 
            value={formData.payment_method}
            onValueChange={(value) => setFormData({...formData, payment_method: value})}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bank_transfer">Transfer Bank</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="check">Check</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Allowances */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <Label>Tunjangan</Label>
          <Button type="button" size="sm" variant="outline" onClick={addAllowance}>
            <Plus className="w-4 h-4 mr-1" />
            Tambah
          </Button>
        </div>
        <div className="space-y-2">
          {formData.allowances.map((allowance, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder="Nama tunjangan"
                value={allowance.name}
                onChange={(e) => updateAllowance(index, 'name', e.target.value)}
              />
              <Input
                type="number"
                placeholder="Jumlah"
                value={allowance.amount}
                onChange={(e) => updateAllowance(index, 'amount', e.target.value)}
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => removeAllowance(index)}
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Deductions */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <Label>Potongan</Label>
          <Button type="button" size="sm" variant="outline" onClick={addDeduction}>
            <Plus className="w-4 h-4 mr-1" />
            Tambah
          </Button>
        </div>
        <div className="space-y-2">
          {formData.deductions.map((deduction, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder="Nama potongan"
                value={deduction.name}
                onChange={(e) => updateDeduction(index, 'name', e.target.value)}
              />
              <Input
                type="number"
                placeholder="Jumlah"
                value={deduction.amount}
                onChange={(e) => updateDeduction(index, 'amount', e.target.value)}
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => removeDeduction(index)}
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="border-t pt-4 space-y-2">
        <div className="flex justify-between">
          <span>Gaji Kotor:</span>
          <span className="font-bold">Rp {(formData.gross_salary || 0).toLocaleString('id-ID')}</span>
        </div>
        <div className="flex justify-between text-lg font-bold">
          <span>Gaji Bersih:</span>
          <span className="text-green-600">Rp {(formData.net_salary || 0).toLocaleString('id-ID')}</span>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Menyimpan...' : 'Simpan'}
        </Button>
      </div>
    </form>
  );
}