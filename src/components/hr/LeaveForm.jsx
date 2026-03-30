import React, { useState } from 'react';
import { Leave } from '@/entities/Leave';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { differenceInDays } from 'date-fns';

export default function LeaveForm({ employees, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    employee_id: '',
    employee_name: '',
    leave_type: 'annual',
    start_date: '',
    end_date: '',
    reason: ''
  });

  const [isSaving, setIsSaving] = useState(false);

  const calculateDays = () => {
    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      return Math.max(1, differenceInDays(end, start) + 1);
    }
    return 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const totalDays = calculateDays();
      await Leave.create({
        ...formData,
        total_days: totalDays,
        status: 'pending'
      });
      toast.success('Cuti berhasil diajukan');
      onSuccess();
    } catch (error) {
      console.error('Error submitting leave:', error);
      toast.error('Gagal mengajukan cuti');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Karyawan *</Label>
        <Select 
          value={formData.employee_id}
          onValueChange={(value) => {
            const emp = employees.find(e => e.id === value);
            setFormData({
              ...formData,
              employee_id: value,
              employee_name: emp?.full_name || ''
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
        <Label>Jenis Cuti *</Label>
        <Select 
          value={formData.leave_type}
          onValueChange={(value) => setFormData({...formData, leave_type: value})}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="annual">Cuti Tahunan</SelectItem>
            <SelectItem value="sick">Sakit</SelectItem>
            <SelectItem value="unpaid">Cuti Tidak Dibayar</SelectItem>
            <SelectItem value="maternity">Cuti Melahirkan</SelectItem>
            <SelectItem value="paternity">Cuti Ayah</SelectItem>
            <SelectItem value="emergency">Darurat</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Tanggal Mulai *</Label>
          <Input
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData({...formData, start_date: e.target.value})}
            required
          />
        </div>

        <div>
          <Label>Tanggal Selesai *</Label>
          <Input
            type="date"
            value={formData.end_date}
            onChange={(e) => setFormData({...formData, end_date: e.target.value})}
            required
          />
        </div>
      </div>

      {formData.start_date && formData.end_date && (
        <div className="text-sm text-gray-600">
          Total: {calculateDays()} hari
        </div>
      )}

      <div>
        <Label>Alasan *</Label>
        <Textarea
          value={formData.reason}
          onChange={(e) => setFormData({...formData, reason: e.target.value})}
          required
          rows={4}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Menyimpan...' : 'Ajukan'}
        </Button>
      </div>
    </form>
  );
}