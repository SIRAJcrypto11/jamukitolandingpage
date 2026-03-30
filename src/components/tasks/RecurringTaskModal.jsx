import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Repeat, Clock } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

export default function RecurringTaskModal({ open, onOpenChange, onSave, initialData, workspaceId }) {
    const [formData, setFormData] = useState(initialData || {
        title: '',
        content: '',
        workspace_id: workspaceId,
        frequency: 'daily',
        interval: 1,
        days_of_week: [],
        day_of_month: 1,
        start_date: new Date(),
        end_date: null,
        priority: 'medium',
        is_active: true
    });

    const daysOfWeek = [
        { value: 0, label: 'Minggu' },
        { value: 1, label: 'Senin' },
        { value: 2, label: 'Selasa' },
        { value: 3, label: 'Rabu' },
        { value: 4, label: 'Kamis' },
        { value: 5, label: 'Jumat' },
        { value: 6, label: 'Sabtu' }
    ];

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.title.trim()) {
            toast.error('Judul tugas tidak boleh kosong');
            return;
        }
        onSave(formData);
    };

    const toggleDayOfWeek = (day) => {
        const currentDays = formData.days_of_week || [];
        const newDays = currentDays.includes(day)
            ? currentDays.filter(d => d !== day)
            : [...currentDays, day];
        setFormData({ ...formData, days_of_week: newDays });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Repeat className="w-5 h-5" />
                        {initialData ? 'Edit Tugas Berulang' : 'Buat Tugas Berulang'}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label>Judul Tugas</Label>
                        <Input
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Misalnya: Meeting tim mingguan"
                        />
                    </div>

                    <div>
                        <Label>Deskripsi (Opsional)</Label>
                        <Textarea
                            value={formData.content}
                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            placeholder="Detail tugas..."
                            rows={3}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Prioritas</Label>
                            <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">Rendah</SelectItem>
                                    <SelectItem value="medium">Sedang</SelectItem>
                                    <SelectItem value="high">Tinggi</SelectItem>
                                    <SelectItem value="urgent">Mendesak</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Frekuensi</Label>
                            <Select value={formData.frequency} onValueChange={(value) => setFormData({ ...formData, frequency: value })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="daily">Harian</SelectItem>
                                    <SelectItem value="weekly">Mingguan</SelectItem>
                                    <SelectItem value="monthly">Bulanan</SelectItem>
                                    <SelectItem value="yearly">Tahunan</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {formData.frequency === 'weekly' && (
                        <div>
                            <Label>Pilih Hari</Label>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {daysOfWeek.map(day => (
                                    <Button
                                        key={day.value}
                                        type="button"
                                        variant={formData.days_of_week?.includes(day.value) ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => toggleDayOfWeek(day.value)}
                                    >
                                        {day.label}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}

                    {formData.frequency === 'monthly' && (
                        <div>
                            <Label>Tanggal dalam Bulan</Label>
                            <Input
                                type="number"
                                min="1"
                                max="31"
                                value={formData.day_of_month}
                                onChange={(e) => setFormData({ ...formData, day_of_month: parseInt(e.target.value) })}
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Mulai Tanggal</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start">
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {formData.start_date ? format(new Date(formData.start_date), 'PPP') : 'Pilih tanggal'}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={formData.start_date ? new Date(formData.start_date) : undefined}
                                        onSelect={(date) => setFormData({ ...formData, start_date: date })}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div>
                            <Label>Berakhir Tanggal (Opsional)</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start">
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {formData.end_date ? format(new Date(formData.end_date), 'PPP') : 'Tanpa batas'}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={formData.end_date ? new Date(formData.end_date) : undefined}
                                        onSelect={(date) => setFormData({ ...formData, end_date: date })}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Batal
                        </Button>
                        <Button type="submit">
                            {initialData ? 'Simpan Perubahan' : 'Buat Tugas Berulang'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}