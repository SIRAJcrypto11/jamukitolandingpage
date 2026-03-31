import { useState } from 'react';
import { Payroll } from '@/entities/Payroll';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import PayrollForm from './PayrollForm';

export default function PayrollManagement({ payrolls, employees, onUpdate }) {
  const [showForm, setShowForm] = useState(false);

  const handleMarkAsPaid = async (payrollId) => {
    try {
      await Payroll.update(payrollId, {
        status: 'paid',
        payment_date: new Date().toISOString().split('T')[0]
      });
      toast.success('Payroll ditandai sebagai dibayar');
      onUpdate();
    } catch (error) {
      console.error('Error updating payroll:', error);
      toast.error('Gagal memperbarui payroll');
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Manajemen Payroll</CardTitle>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Buat Payroll
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Karyawan</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead>Gaji Pokok</TableHead>
                <TableHead>Tunjangan</TableHead>
                <TableHead>Potongan</TableHead>
                <TableHead>Gaji Bersih</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payrolls.map((payroll) => (
                <TableRow key={payroll.id}>
                  <TableCell className="font-medium">
                    {payroll.employee_name}
                  </TableCell>
                  <TableCell>{payroll.period}</TableCell>
                  <TableCell>
                    Rp {(payroll.basic_salary || 0).toLocaleString('id-ID')}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {payroll.allowances?.map((a, i) => (
                        <div key={i} className="text-green-600">
                          +Rp {a.amount.toLocaleString('id-ID')}
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {payroll.deductions?.map((d, i) => (
                        <div key={i} className="text-red-600">
                          -Rp {d.amount.toLocaleString('id-ID')}
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="font-bold">
                    Rp {(payroll.net_salary || 0).toLocaleString('id-ID')}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(payroll.status)}>
                      {payroll.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {payroll.status !== 'paid' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkAsPaid(payroll.id)}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Bayar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {payrolls.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Belum ada payroll
            </div>
          )}
        </div>
      </CardContent>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Buat Payroll Baru</DialogTitle>
          </DialogHeader>
          <PayrollForm
            employees={employees}
            onSuccess={() => {
              setShowForm(false);
              onUpdate();
            }}
            onCancel={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}