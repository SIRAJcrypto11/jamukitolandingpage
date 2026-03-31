import { useState } from 'react';
import { CompanyMember } from '@/entities/CompanyMember';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { 
  UserPlus, 
  Edit, 
  Trash2, 
  Search,
  Mail,
  Phone,
  DollarSign
} from 'lucide-react';
import { toast } from 'sonner';
import EmployeeForm from './EmployeeForm';

export default function EmployeeList({ employees, company, currentUser, onUpdate }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredEmployees = employees.filter((emp) =>
    emp.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.position?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setShowForm(true);
  };

  const handleDelete = async (employeeId) => {
    if (!confirm('Yakin ingin menghapus karyawan ini?')) return;
    
    setIsDeleting(true);
    try {
      await CompanyMember.delete(employeeId);
      toast.success('Karyawan berhasil dihapus');
      onUpdate();
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error('Gagal menghapus karyawan');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role) => {
    const labels = {
      owner: 'Owner',
      admin: 'Admin',
      supervisor: 'Supervisor',
      store_admin: 'Store Admin',
      stock_admin: 'Stock Admin',
      finance_admin: 'Finance Admin',
      hr_admin: 'HR Admin',
      transaction_admin: 'Transaction Admin',
      employee: 'Employee'
    };
    return labels[role] || role;
  };

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-white">Daftar Karyawan ({employees.length})</CardTitle>
          <Button 
            onClick={() => {
              setEditingEmployee(null);
              setShowForm(true);
            }}
            className="bg-blue-600"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Tambah Karyawan
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Cari karyawan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white"
            />
          </div>

          <div className="rounded-md border border-gray-700 overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-800">
                <TableRow className="border-gray-700 hover:bg-gray-800">
                  <TableHead className="text-gray-300">Nama</TableHead>
                  <TableHead className="text-gray-300">Jabatan</TableHead>
                  <TableHead className="text-gray-300">Departemen</TableHead>
                  <TableHead className="text-gray-300">Role</TableHead>
                  <TableHead className="text-gray-300">Status</TableHead>
                  <TableHead className="text-gray-300">Gaji</TableHead>
                  <TableHead className="text-right text-gray-300">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((employee) => (
                  <TableRow key={employee.id} className="border-gray-700 hover:bg-gray-800/50">
                    <TableCell className="text-white">
                      <div>
                        <div className="font-medium">{employee.user_name}</div>
                        <div className="text-sm text-gray-400 flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {employee.user_email}
                        </div>
                        {employee.phone && (
                          <div className="text-sm text-gray-400 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {employee.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-white">{employee.position || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-gray-600 text-gray-300">
                        {employee.department || 'Unassigned'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        employee.role === 'owner' ? 'bg-yellow-600' :
                        employee.role === 'admin' ? 'bg-purple-600' :
                        employee.role === 'supervisor' ? 'bg-blue-600' :
                        'bg-gray-600'
                      }>
                        {getRoleLabel(employee.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(employee.status)}>
                        {employee.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white">
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-green-400" />
                        Rp {(employee.salary || 0).toLocaleString('id-ID')}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(employee)}
                          className="text-blue-400 hover:text-blue-300 hover:bg-gray-800"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {employee.role !== 'owner' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(employee.id)}
                            disabled={isDeleting}
                            className="text-red-400 hover:text-red-300 hover:bg-gray-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredEmployees.length === 0 && (
              <div className="text-center py-12 text-gray-400 bg-gray-900">
                {searchQuery ? 'Tidak ada karyawan ditemukan' : 'Belum ada karyawan'}
              </div>
            )}
          </div>
        </div>
      </CardContent>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingEmployee ? 'Edit Karyawan' : 'Tambah Karyawan Baru'}
            </DialogTitle>
          </DialogHeader>
          <EmployeeForm
            employee={editingEmployee}
            company={company}
            currentUser={currentUser}
            onSuccess={() => {
              setShowForm(false);
              setEditingEmployee(null);
              onUpdate();
            }}
            onCancel={() => {
              setShowForm(false);
              setEditingEmployee(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}