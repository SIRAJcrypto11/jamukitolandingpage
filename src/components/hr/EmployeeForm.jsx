import React, { useState } from 'react';
import { Employee } from '@/entities/Employee';
import { CompanyMember } from '@/entities/CompanyMember';
import { Company } from '@/entities/Company';
import { SendEmail } from '@/integrations/Core';
import { User } from '@/entities/User';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function EmployeeForm({ employee, company, currentUser, onSuccess, onCancel }) {
  const [formData, setFormData] = useState(employee || {
    user_name: '',
    user_email: '',
    phone: '',
    department: 'Operations',
    position: '',
    status: 'active',
    joined_date: new Date().toISOString().split('T')[0],
    salary: 0,
    role: 'employee'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (employee && employee.id) {
        // ✅ FIX: Update CompanyMember instead of Employee
        await CompanyMember.update(employee.id, {
          user_name: formData.user_name,
          phone: formData.phone,
          department: formData.department,
          position: formData.position,
          salary: formData.salary,
          status: formData.status,
          role: formData.role
        });
        
        toast.success('✅ Data karyawan berhasil diupdate');
        onSuccess();
        return;
      }

      // Create new employee - Auto-invite user
      const employeeId = `EMP-${Date.now()}`;
      
      // Create Employee record first
      const newEmployee = await Employee.create({
        company_id: company.id,
        employee_id: employeeId,
        full_name: formData.user_name,
        email: formData.user_email,
        phone: formData.phone,
        department: formData.department,
        position: formData.position,
        employment_type: 'full_time',
        hire_date: formData.joined_date,
        salary: formData.salary,
        status: formData.status
      });

      // Check if user exists
      try {
        const users = await User.filter({ email: formData.user_email });
        
        if (users.length > 0) {
          const invitedUser = users[0];
          
          // Auto-add as company member
          await CompanyMember.create({
            company_id: company.id,
            user_id: invitedUser.id,
            user_email: formData.user_email,
            user_name: formData.user_name,
            role: formData.role,
            employee_id: newEmployee.id,
            department: formData.department,
            position: formData.position,
            phone: formData.phone,
            salary: formData.salary,
            status: 'active',
            joined_date: formData.joined_date,
            invited_by: currentUser.email,
            permissions: {
              can_view_dashboard: true,
              can_view_tasks: true,
              can_create_tasks: true,
              can_edit_tasks: true,
              can_delete_tasks: false,
              can_view_notes: true,
              can_create_notes: true,
              can_edit_notes: true,
              can_delete_notes: false,
              can_view_hr: formData.role === 'hr_admin',
              can_edit_hr: formData.role === 'hr_admin',
              can_view_finance: formData.role === 'finance_admin' || formData.role === 'admin',
              can_edit_finance: formData.role === 'finance_admin' || formData.role === 'admin',
              can_view_inventory: formData.role === 'stock_admin' || formData.role === 'admin',
              can_edit_inventory: formData.role === 'stock_admin' || formData.role === 'admin',
              can_view_projects: true,
              can_edit_projects: formData.role === 'admin' || formData.role === 'supervisor',
              can_view_pos: formData.role === 'store_admin' || formData.role === 'admin',
              can_use_pos: formData.role === 'store_admin' || formData.role === 'admin' || formData.role === 'employee',
              can_view_reports: formData.role === 'admin' || formData.role === 'supervisor',
              can_manage_members: formData.role === 'admin',
              can_manage_roles: formData.role === 'admin',
              can_view_settings: formData.role === 'admin',
              can_edit_settings: formData.role === 'admin'
            }
          });

          // Send welcome email
          try {
            await SendEmail({
              to: formData.user_email,
              subject: `Selamat Bergabung di ${company.name}`,
              body: `
                <h2>Selamat Datang ${formData.user_name}!</h2>
                <p>Anda telah ditambahkan sebagai karyawan di <strong>${company.name}</strong></p>
                <p><strong>Posisi:</strong> ${formData.position}</p>
                <p><strong>Departemen:</strong> ${formData.department}</p>
                <p><strong>Tanggal Bergabung:</strong> ${formData.joined_date}</p>
                <p>Anda sekarang memiliki akses ke sistem ERP perusahaan melalui akun SNISHOP Anda.</p>
                <p>Login di: https://snishop.com</p>
              `
            });
          } catch (emailError) {
            console.log('Email notification failed:', emailError);
          }

          toast.success(`✅ Karyawan ditambahkan dan ${formData.user_name} otomatis tergabung!`);
        } else {
          // User doesn't exist - send invitation email
          try {
            await SendEmail({
              to: formData.user_email,
              subject: `Undangan Bergabung - ${company.name}`,
              body: `
                <h2>Undangan Karyawan</h2>
                <p>Halo ${formData.user_name},</p>
                <p>Anda diundang bergabung sebagai karyawan di <strong>${company.name}</strong></p>
                <p><strong>Posisi:</strong> ${formData.position}</p>
                <p><strong>Departemen:</strong> ${formData.department}</p>
                <p>Untuk mulai, silakan daftar di SNISHOP menggunakan email ini:</p>
                <p><a href="https://snishop.com">https://snishop.com</a></p>
                <p>Setelah mendaftar, Anda akan otomatis tergabung ke perusahaan.</p>
              `
            });
            toast.success(`✅ Karyawan ditambahkan! Email undangan dikirim ke ${formData.user_email}`);
          } catch (emailError) {
            toast.success('✅ Karyawan ditambahkan (email undangan gagal dikirim)');
          }
        }
      } catch (userCheckError) {
        toast.success('✅ Karyawan ditambahkan');
      }

      // Update company employee count
      try {
        await Company.update(company.id, {
          employee_count: (company.employee_count || 0) + 1
        });
      } catch (e) {
        console.log('Could not update employee count:', e);
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving employee:', error);
      toast.error('❌ Gagal menyimpan karyawan: ' + (error?.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-gray-300">Nama Lengkap *</Label>
          <Input
            value={formData.user_name}
            onChange={(e) => setFormData({...formData, user_name: e.target.value})}
            className="bg-gray-800 border-gray-700 text-white mt-2"
            required
          />
        </div>

        <div>
          <Label className="text-gray-300">Email *</Label>
          <div className="relative">
            <Input
              type="email"
              value={formData.user_email}
              onChange={(e) => setFormData({...formData, user_email: e.target.value})}
              className="pr-10 bg-gray-800 border-gray-700 text-white mt-2"
              required
              disabled={!!employee}
            />
            <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
          {!employee && (
            <p className="text-xs text-gray-500 mt-1">
              Otomatis mengundang user untuk join perusahaan
            </p>
          )}
        </div>

        <div>
          <Label className="text-gray-300">Telepon</Label>
          <Input
            value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
            className="bg-gray-800 border-gray-700 text-white mt-2"
          />
        </div>

        <div>
          <Label className="text-gray-300">Departemen *</Label>
          <Select
            value={formData.department}
            onValueChange={(value) => setFormData({...formData, department: value})}
          >
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              <SelectItem value="Management">Management</SelectItem>
              <SelectItem value="Sales">Sales</SelectItem>
              <SelectItem value="Marketing">Marketing</SelectItem>
              <SelectItem value="Operations">Operations</SelectItem>
              <SelectItem value="Finance">Finance</SelectItem>
              <SelectItem value="IT">IT</SelectItem>
              <SelectItem value="HR">HR</SelectItem>
              <SelectItem value="Customer Service">Customer Service</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-gray-300">Posisi *</Label>
          <Input
            value={formData.position}
            onChange={(e) => setFormData({...formData, position: e.target.value})}
            className="bg-gray-800 border-gray-700 text-white mt-2"
            required
          />
        </div>

        <div>
          <Label className="text-gray-300">Role *</Label>
          <Select
            value={formData.role}
            onValueChange={(value) => setFormData({...formData, role: value})}
          >
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              <SelectItem value="employee">Employee</SelectItem>
              <SelectItem value="supervisor">Supervisor</SelectItem>
              <SelectItem value="store_admin">Store Admin</SelectItem>
              <SelectItem value="stock_admin">Stock Admin</SelectItem>
              <SelectItem value="finance_admin">Finance Admin</SelectItem>
              <SelectItem value="hr_admin">HR Admin</SelectItem>
              <SelectItem value="transaction_admin">Transaction Admin</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-gray-300">Gaji (Monthly)</Label>
          <Input
            type="number"
            value={formData.salary}
            onChange={(e) => setFormData({...formData, salary: Number(e.target.value)})}
            className="bg-gray-800 border-gray-700 text-white mt-2"
          />
        </div>

        <div>
          <Label className="text-gray-300">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value) => setFormData({...formData, status: value})}
          >
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting} className="border-gray-700">
          Batal
        </Button>
        <Button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {employee ? 'Update Karyawan' : 'Tambah & Undang'}
        </Button>
      </div>
    </form>
  );
}