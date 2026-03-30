import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { User } from '@/entities/User';
import { DepositRequest } from '@/entities/DepositRequest';
import { Notification } from '@/entities/Notification';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Loader2, CheckCircle, XCircle, Eye } from 'lucide-react';

const formatCurrency = (amount) => `Rp ${Number(amount || 0).toLocaleString('id-ID')}`;

export default function DepositRequestsTab({ requests, onUpdateRequest }) {
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [adminNotes, setAdminNotes] = useState('');

    const handleAction = async (action) => {
        if (!selectedRequest) return;
        setIsProcessing(true);
        try {
            if (action === 'approve') {
                const user = await User.get(selectedRequest.user_id);
                if (!user) throw new Error("Pengguna tidak ditemukan.");

                const currentBalance = user.balance || 0;
                const newBalance = currentBalance + selectedRequest.amount;

                await User.update(user.id, {
                    balance: newBalance
                });

                await DepositRequest.update(selectedRequest.id, {
                    status: 'approved',
                    admin_notes: adminNotes || `Deposit disetujui. Saldo bertambah ${formatCurrency(selectedRequest.amount)}.`
                });

                await Notification.create({
                    user_id: user.email,
                    title: "✅ Deposit Disetujui!",
                    message: `Deposit Rp ${selectedRequest.amount.toLocaleString('id-ID')} telah ditambahkan ke saldo Anda. Saldo sekarang: Rp ${newBalance.toLocaleString('id-ID')}`,
                    url: '/saldo'
                }).catch(() => {});

                toast.success(`✅ Deposit disetujui! Saldo ${user.full_name || user.email}: ${formatCurrency(newBalance)}`);
            } else {
                await DepositRequest.update(selectedRequest.id, {
                    status: 'rejected',
                    admin_notes: adminNotes || 'Deposit ditolak.'
                });
                
                await Notification.create({
                    user_id: selectedRequest.user_email,
                    title: "❌ Deposit Ditolak",
                    message: `Maaf, deposit Rp ${selectedRequest.amount.toLocaleString('id-ID')} Anda ditolak. ${adminNotes || ''}`,
                    url: '/saldo'
                }).catch(() => {});
                
                toast.success('Deposit ditolak.');
            }
            onUpdateRequest();
            setSelectedRequest(null);
            setAdminNotes('');
        } catch (error) {
            console.error('Error processing deposit:', error);
            toast.error(`Gagal memproses: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tanggal</TableHead>
                            <TableHead>Pengguna</TableHead>
                            <TableHead>Jumlah</TableHead>
                            <TableHead>Metode</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {requests.length > 0 ? requests.map(req => (
                            <TableRow key={req.id}>
                                <TableCell>{format(new Date(req.created_date), 'dd MMM yyyy, HH:mm', { locale: id })}</TableCell>
                                <TableCell>
                                    <div>
                                        <p className="font-medium">{req.user_full_name}</p>
                                        <p className="text-sm text-gray-500">{req.user_email}</p>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <p className="font-semibold text-green-600">{formatCurrency(req.amount)}</p>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={
                                        req.payment_method === 'tripay' ? 'border-green-600 text-green-400' : 'text-gray-400'
                                    }>
                                        {req.payment_method === 'tripay' ? '💳 Tripay' : '📧 Manual'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={
                                        req.status === 'pending' ? 'default' : 
                                        req.status === 'approved' ? 'secondary' : 
                                        'destructive'
                                    }>
                                        {req.status === 'pending' ? 'Pending' : 
                                         req.status === 'approved' ? 'Disetujui' : 
                                         'Ditolak'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => { 
                                            setSelectedRequest(req); 
                                            setAdminNotes(''); 
                                        }}
                                    >
                                        <Eye className="w-4 h-4 mr-1" />
                                        Detail
                                    </Button>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan="6" className="text-center text-gray-500">
                                    Tidak ada permintaan deposit.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            
            <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Detail Permintaan Deposit</DialogTitle>
                        <DialogDescription>
                            Tinjau dan proses permintaan deposit dari pengguna.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedRequest && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-gray-500">Pengguna</Label>
                                    <p className="font-medium">{selectedRequest.user_full_name}</p>
                                    <p className="text-sm text-gray-500">{selectedRequest.user_email}</p>
                                </div>
                                <div>
                                    <Label className="text-gray-500">Jumlah Deposit</Label>
                                    <p className="text-2xl font-bold text-green-600">{formatCurrency(selectedRequest.amount)}</p>
                                </div>
                            </div>
                            
                            <div>
                                <Label className="text-gray-500">Tanggal Permintaan</Label>
                                <p>{format(new Date(selectedRequest.created_date), 'dd MMMM yyyy, HH:mm', { locale: id })}</p>
                            </div>

                            {selectedRequest.proof_image_url && selectedRequest.proof_image_url !== 'tripay_payment_pending' && (
                                <div>
                                    <Label className="text-gray-500">Bukti Transfer</Label>
                                    <a 
                                        href={selectedRequest.proof_image_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="block mt-2"
                                    >
                                        <img 
                                            src={selectedRequest.proof_image_url} 
                                            alt="Bukti Transfer" 
                                            className="rounded-lg border max-h-96 w-auto hover:opacity-80 transition"
                                        />
                                    </a>
                                </div>
                            )}

                            {selectedRequest.status === 'pending' && (
                                <div>
                                    <Label>Catatan Admin (Opsional)</Label>
                                    <Textarea 
                                        placeholder="Tambahkan catatan untuk pengguna..." 
                                        value={adminNotes} 
                                        onChange={(e) => setAdminNotes(e.target.value)}
                                        rows={3}
                                    />
                                </div>
                            )}
                            
                            {selectedRequest.status !== 'pending' && selectedRequest.admin_notes && (
                                <div>
                                    <Label className="text-gray-500">Catatan Admin</Label>
                                    <p className="text-sm">{selectedRequest.admin_notes}</p>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button 
                            variant="ghost" 
                            onClick={() => setSelectedRequest(null)}
                            disabled={isProcessing}
                        >
                            Tutup
                        </Button>
                        {selectedRequest?.status === 'pending' && (
                            <>
                                <Button 
                                    variant="destructive" 
                                    onClick={() => handleAction('reject')} 
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <XCircle className="w-4 h-4 mr-2" />
                                            Tolak
                                        </>
                                    )}
                                </Button>
                                <Button 
                                    onClick={() => handleAction('approve')} 
                                    disabled={isProcessing}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    {isProcessing ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                            Setujui & Update Saldo
                                        </>
                                    )}
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}