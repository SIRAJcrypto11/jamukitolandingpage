import { useState } from 'react';
import { Leave } from '@/entities/Leave';
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
import { CheckCircle, XCircle, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import LeaveForm from './LeaveForm';

export default function LeaveManagement({ leaves, employees, onUpdate }) {
  const [showForm, setShowForm] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);

  const handleApprove = async (leaveId) => {
    try {
      await Leave.update(leaveId, {
        status: 'approved',
        approved_at: new Date().toISOString()
      });
      toast.success('Cuti disetujui');
      onUpdate();
    } catch (error) {
      console.error('Error approving leave:', error);
      toast.error('Gagal menyetujui cuti');
    }
  };

  const handleReject = async (leaveId) => {
    try {
      await Leave.update(leaveId, {
        status: 'rejected'
      });
      toast.success('Cuti ditolak');
      onUpdate();
    } catch (error) {
      console.error('Error rejecting leave:', error);
      toast.error('Gagal menolak cuti');
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLeaveTypeColor = (type) => {
    switch(type) {
      case 'annual': return 'bg-blue-100 text-blue-800';
      case 'sick': return 'bg-red-100 text-red-800';
      case 'emergency': return 'bg-orange-100 text-orange-800';
      case 'maternity': return 'bg-pink-100 text-pink-800';
      case 'paternity': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Manajemen Cuti</CardTitle>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Ajukan Cuti
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Karyawan</TableHead>
                <TableHead>Jenis Cuti</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Durasi</TableHead>
                <TableHead>Alasan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaves.map((leave) => (
                <TableRow key={leave.id}>
                  <TableCell className="font-medium">
                    {leave.employee_name}
                  </TableCell>
                  <TableCell>
                    <Badge className={getLeaveTypeColor(leave.leave_type)}>
                      {leave.leave_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{format(new Date(leave.start_date), 'dd MMM yyyy', { locale: id })}</div>
                      <div className="text-gray-500">
                        s/d {format(new Date(leave.end_date), 'dd MMM yyyy', { locale: id })}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{leave.total_days} hari</TableCell>
                  <TableCell className="max-w-xs truncate">{leave.reason}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(leave.status)}>
                      {leave.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {leave.status === 'pending' && (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApprove(leave.id)}
                        >
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(leave.id)}
                        >
                          <XCircle className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {leaves.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Tidak ada pengajuan cuti
            </div>
          )}
        </div>
      </CardContent>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajukan Cuti</DialogTitle>
          </DialogHeader>
          <LeaveForm
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