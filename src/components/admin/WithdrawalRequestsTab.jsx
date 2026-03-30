import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { WithdrawalRequest } from '@/entities/WithdrawalRequest';
import { User } from '@/entities/User';
import { UploadFile } from '@/integrations/Core';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';

const formatCurrency = (amount) => `Rp ${Number(amount || 0).toLocaleString('id-ID')}`;

export default function WithdrawalRequestsTab({ requests, onUpdateRequest }) {
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [action, setAction] = useState(null); // 'approve' or 'reject'
    const [proofFile, setProofFile] = useState(null);
    const [adminNotes, setAdminNotes] = useState('');

    const handleAction = async () => {
        if (!selectedRequest) return;

        setIsProcessing(true);
        try {
            if (action === 'approve') {
                if (!proofFile) {
                    toast.error("Bukti transfer harus diunggah.");
                    setIsProcessing(false);
                    return;
                }
                
                // Upload proof
                const { file_url } = await UploadFile({ file: proofFile });
                
                // Update withdrawal request
                await WithdrawalRequest.update(selectedRequest.id, { 
                    status: 'approved',
                    proof_of_transfer_url: file_url,
                    admin_notes: adminNotes
                });

                // Decrement user balance from correct source
                const user = await User.get(selectedRequest.user_id);
                const source = selectedRequest.withdrawal_source || 'commission';
                
                if (source === 'admin_commission') {
                    const newBalance = Math.max(0, (user.admin_commission_balance || 0) - selectedRequest.amount);
                    await User.update(user.id, {
                        admin_commission_balance: newBalance
                    });
                } else {
                    const newBalance = Math.max(0, (user.commission_balance || 0) - selectedRequest.amount);
                    await User.update(user.id, {
                        commission_balance: newBalance
                    });
                }

                toast.success("Penarikan berhasil disetujui dan saldo telah dikurangi.");
            } else if (action === 'reject') {
                await WithdrawalRequest.update(selectedRequest.id, { 
                    status: 'rejected',
                    admin_notes: adminNotes 
                });
                toast.warning("Penarikan telah ditolak.");
            }
            
            onUpdateRequest();
            closeModal();
        } catch (error) {
            toast.error("Gagal memproses permintaan: " + error.message);
            console.error(error);
        } finally {
            setIsProcessing(false);
        }
    };

    const openModal = (request, type) => {
        setSelectedRequest(request);
        setAction(type);
        setAdminNotes('');
        setProofFile(null);
    };

    const closeModal = () => {
        setSelectedRequest(null);
        setAction(null);
    };
    
    const sortedRequests = [...requests].sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(b.created_date) - new Date(a.created_date);
    });

    return (
        <>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Pengguna</TableHead>
                        <TableHead>Jenis</TableHead>
                        <TableHead>Jumlah</TableHead>
                        <TableHead>Rekening Tujuan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Aksi</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedRequests.length > 0 ? sortedRequests.map(req => (
                        <TableRow key={req.id}>
                            <TableCell>{format(new Date(req.created_date), 'dd MMM yyyy, HH:mm', { locale: id })}</TableCell>
                            <TableCell>{req.user_email}</TableCell>
                            <TableCell>
                                <Badge variant="outline" className={req.withdrawal_source === 'admin_commission' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}>
                                    {req.withdrawal_source === 'admin_commission' ? 'Komisi Admin' : 'Komisi Referral'}
                                </Badge>
                            </TableCell>
                            <TableCell>{formatCurrency(req.amount)}</TableCell>
                            <TableCell>
                                {req.bank_account_details.provider.toUpperCase()} - {req.bank_account_details.account_number} a/n {req.bank_account_details.account_name}
                            </TableCell>
                            <TableCell>
                                <Badge variant={
                                    req.status === 'pending' ? 'default' :
                                    req.status === 'approved' ? 'secondary' : 'destructive'
                                }>
                                    {req.status === 'pending' ? 'Pending' : req.status === 'approved' ? 'Disetujui' : 'Ditolak'}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                {req.status === 'pending' && (
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" onClick={() => openModal(req, 'approve')}>Setujui</Button>
                                        <Button size="sm" variant="destructive" onClick={() => openModal(req, 'reject')}>Tolak</Button>
                                    </div>
                                )}
                                {req.status === 'approved' && req.proof_of_transfer_url && (
                                    <Button asChild size="sm" variant="link">
                                        <a href={req.proof_of_transfer_url} target="_blank" rel="noopener noreferrer">Lihat Bukti</a>
                                    </Button>
                                )}
                            </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center">Belum ada permintaan penarikan.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
            
            <Dialog open={!!selectedRequest} onOpenChange={closeModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Konfirmasi Penarikan: {action === 'approve' ? 'Setujui' : 'Tolak'}</DialogTitle>
                        <DialogDescription>
                            Anda akan {action === 'approve' ? 'menyetujui' : 'menolak'} penarikan oleh {selectedRequest?.user_email} sebesar {formatCurrency(selectedRequest?.amount || 0)}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        {selectedRequest && (
                            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                                <p className="text-sm text-gray-600 dark:text-gray-400">Jenis Penarikan:</p>
                                <Badge variant="outline" className={selectedRequest.withdrawal_source === 'admin_commission' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}>
                                    {selectedRequest.withdrawal_source === 'admin_commission' ? 'Komisi Admin Basic' : 'Komisi Referral'}
                                </Badge>
                            </div>
                        )}
                        
                        {action === 'approve' && (
                            <div>
                                <Label htmlFor="proof">Unggah Bukti Transfer</Label>
                                <Input id="proof" type="file" onChange={e => setProofFile(e.target.files[0])} accept="image/*,application/pdf" />
                            </div>
                        )}
                        <div>
                            <Label htmlFor="notes">Catatan Admin (Opsional)</Label>
                            <Textarea id="notes" value={adminNotes} onChange={e => setAdminNotes(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={closeModal} disabled={isProcessing}>Batal</Button>
                        <Button onClick={handleAction} disabled={isProcessing}>
                            {isProcessing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Memproses...
                                </>
                            ) : (
                                'Konfirmasi'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}