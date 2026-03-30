
import React, { useState, useEffect, useRef } from 'react';
import { ProductOrder } from '@/entities/ProductOrder';
import { User } from '@/entities/User';
import { Notification } from '@/entities/Notification';
import { UploadFile } from '@/integrations/Core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShoppingCart, Eye, Trash2, Download, DollarSign, CheckCircle, Clock, Package, Bell, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

const formatCurrency = (amount) => `Rp ${Number(amount || 0).toLocaleString('id-ID')}`;

export default function OrdersTab({ orders, onUpdate }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState('');
    const [adminNotes, setAdminNotes] = useState('');
    const [resultFiles, setResultFiles] = useState([]);
    const [filterStatus, setFilterStatus] = useState('all');
    const [newOrdersCount, setNewOrdersCount] = useState(0);
    const [lastOrderCount, setLastOrderCount] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        loadCurrentUser();
        
        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    useEffect(() => {
        checkNewOrders();
    }, [orders, currentUser]);

    const loadCurrentUser = async () => {
        try {
            const user = await User.me();
            setCurrentUser(user);
        } catch (error) {
            console.error('Error loading user:', error);
        }
    };

    const checkNewOrders = () => {
        if (!currentUser) return;

        // Count unassigned pending orders
        const unassignedOrders = orders.filter(o => 
            o.status === 'pending' && 
            !o.assigned_to_admin
        );

        const currentCount = unassignedOrders.length;
        
        // If there are new orders since last check and it's not the initial load
        if (currentCount > lastOrderCount && lastOrderCount > 0) {
            showNewOrderNotification();
        }
        
        setNewOrdersCount(currentCount);
        setLastOrderCount(currentCount);
    };

    const showNewOrderNotification = () => {
        // Browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('🎉 Ada Order Baru!', {
                body: 'Hallo admin, ada pesanan baru! Yuk diproses.',
                icon: '/favicon.ico',
                tag: 'new-order',
                requireInteraction: true
            });
        }

        // Toast notification
        toast.success('🎉 Ada Order Baru!', {
            description: 'Pesanan baru masuk, yuk diproses!',
            duration: 10000,
            action: {
                label: 'Lihat',
                onClick: () => setFilterStatus('pending')
            }
        });

        // Play notification sound - LOUD ALERT
        try {
            // Create audio context for better sound control
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Set frequency and volume
            oscillator.frequency.value = 800; // Higher pitch for attention
            gainNode.gain.value = 0.3; // 30% volume
            
            oscillator.type = 'sine';
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
            
            // Second beep
            setTimeout(() => {
                const osc2 = audioContext.createOscillator();
                const gain2 = audioContext.createGain();
                osc2.connect(gain2);
                gain2.connect(audioContext.destination);
                osc2.frequency.value = 1000;
                gain2.gain.value = 0.3;
                osc2.start(audioContext.currentTime);
                osc2.stop(audioContext.currentTime + 0.2);
            }, 250);
        } catch (e) {
            console.log('Audio notification failed:', e);
        }
    };

    const handleManualRefresh = async () => {
        setIsRefreshing(true);
        try {
            await onUpdate();
            toast.success('Data pesanan diperbarui!');
        } catch (error) {
            toast.error('Gagal memperbarui data');
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleClaimOrder = async (order) => {
        if (!currentUser || currentUser.admin_type !== 'basic') {
            toast.error('Hanya Admin Basic yang bisa mengambil order');
            return;
        }

        setIsProcessing(true);
        try {
            await ProductOrder.update(order.id, {
                assigned_to_admin: currentUser.email,
                assigned_at: new Date().toISOString(),
                status: 'processing'
            });

            toast.success('Order berhasil diambil! Silakan proses.');
            onUpdate();
            
            // Open detail modal
            const updatedOrder = await ProductOrder.get(order.id);
            handleViewDetail(updatedOrder);
        } catch (error) {
            toast.error('Gagal mengambil order');
            console.error(error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleViewDetail = (order) => {
        // Calculate commission for preview
        const commissionAmount = order.final_price * (order.product_commission_rate || 0);
        
        setSelectedOrder({ ...order, preview_commission: commissionAmount });
        setStatus(order.status);
        setAdminNotes(order.admin_notes || '');
        setResultFiles(order.result_files || []);
        setIsDetailModalOpen(true);
    };

    const handleFileUpload = async (file) => {
        try {
            toast.info("Mengunggah file...");
            const { file_url } = await UploadFile({ file });
            setResultFiles(prev => [...prev, file_url]);
            toast.success("File berhasil diunggah");
        } catch (error) {
            toast.error("Gagal mengunggah file");
            console.error(error);
        }
    };

    const handleRemoveFile = (index) => {
        setResultFiles(prev => prev.filter((_, i) => i !== index));
        toast.info("File dihapus dari daftar");
    };

    const handleUpdateOrder = async () => {
        if (!selectedOrder) return;

        setIsProcessing(true);
        try {
            const updateData = {
                status,
                admin_notes: adminNotes,
                result_files: resultFiles,
                processed_by_admin: currentUser.email
            };
            
            // Calculate and add commission when completing order
            if (status === 'completed' && !selectedOrder.admin_commission_paid) {
                const commissionRate = selectedOrder.product_commission_rate || 0;
                const commissionAmount = selectedOrder.final_price * commissionRate;
                
                updateData.admin_commission_amount = commissionAmount;
                updateData.admin_commission_paid = false;
                updateData.completed_at = new Date().toISOString();
                
                // Update admin's commission balance
                if (currentUser.admin_type === 'basic' && commissionAmount > 0) {
                    const currentBalance = currentUser.admin_commission_balance || 0;
                    await User.update(currentUser.id, {
                        admin_commission_balance: currentBalance + commissionAmount
                    });

                    toast.success(`Order selesai! Komisi Anda: ${formatCurrency(commissionAmount)}`);
                }
            }

            await ProductOrder.update(selectedOrder.id, updateData);

            // Send notification to customer
            let notifTitle = "";
            let notifMessage = "";

            if (status === 'processing') {
                notifTitle = "🔄 Pesanan Sedang Diproses";
                notifMessage = `Pesanan Anda "${selectedOrder.product_name}" sedang diproses oleh admin.`;
            } else if (status === 'completed') {
                notifTitle = "✅ Pesanan Selesai!";
                notifMessage = `Pesanan Anda "${selectedOrder.product_name}" telah selesai. Silakan cek detail pesanan untuk mengunduh hasil.`;
            } else if (status === 'cancelled') {
                notifTitle = "❌ Pesanan Dibatalkan";
                notifMessage = `Pesanan Anda "${selectedOrder.product_name}" dibatalkan. ${adminNotes ? 'Alasan: ' + adminNotes : ''}`;
            }

            if (notifTitle) {
                await Notification.create({
                    user_id: selectedOrder.customer_email,
                    title: notifTitle,
                    message: notifMessage,
                    url: '/my-orders'
                });
            }

            toast.success("Pesanan berhasil diperbarui dan notifikasi terkirim!");
            setIsDetailModalOpen(false);
            onUpdate();
        } catch (error) {
            toast.error("Gagal memperbarui pesanan");
            console.error(error);
        } finally {
            setIsProcessing(false);
        }
    };

    const getStatusBadge = (orderStatus) => {
        const config = {
            pending: { label: "Menunggu", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", icon: Clock },
            processing: { label: "Diproses", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", icon: Package },
            completed: { label: "Selesai", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", icon: CheckCircle },
            cancelled: { label: "Dibatalkan", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", icon: Download }
        };
        return config[orderStatus] || config.pending;
    };

    const isBasicAdmin = currentUser?.admin_type === 'basic';
    
    // Filter orders based on role and status
    const filteredOrders = orders.filter(order => {
        // Status filter
        if (filterStatus !== 'all' && order.status !== filterStatus) return false;

        // For basic admin: only show unassigned orders or orders assigned to them
        if (isBasicAdmin) {
            return !order.assigned_to_admin || order.assigned_to_admin === currentUser.email;
        }

        // For owner admin: show all
        return true;
    });

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Manajemen Pesanan ({filteredOrders.length})</CardTitle>
                            {newOrdersCount > 0 && (
                                <motion.p 
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="text-sm text-orange-600 font-semibold mt-1 flex items-center gap-2"
                                >
                                    <Bell className="w-4 h-4 animate-bounce" />
                                    🔥 {newOrdersCount} pesanan baru menunggu!
                                </motion.p>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleManualRefresh}
                                disabled={isRefreshing}
                                className="flex items-center gap-2"
                            >
                                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger className="w-40">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Status</SelectItem>
                                    <SelectItem value="pending">Menunggu</SelectItem>
                                    <SelectItem value="processing">Diproses</SelectItem>
                                    <SelectItem value="completed">Selesai</SelectItem>
                                    <SelectItem value="cancelled">Dibatalkan</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tanggal</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Produk</TableHead>
                                    <TableHead>Harga</TableHead>
                                    {isBasicAdmin && <TableHead>Komisi</TableHead>}
                                    <TableHead>Status</TableHead>
                                    <TableHead>Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <AnimatePresence>
                                    {filteredOrders.map(order => {
                                        const statusConfig = getStatusBadge(order.status);
                                        const StatusIcon = statusConfig.icon;
                                        const commission = order.final_price * (order.product_commission_rate || 0);
                                        const isUnassigned = !order.assigned_to_admin;

                                        return (
                                            <motion.tr 
                                                key={order.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 20 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                <TableCell>
                                                    {format(new Date(order.created_date), 'dd MMM yyyy HH:mm', { locale: id })}
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium">{order.customer_name}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">{order.customer_email}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{order.product_name}</TableCell>
                                                <TableCell className="font-semibold">{formatCurrency(order.final_price)}</TableCell>
                                                {isBasicAdmin && (
                                                    <TableCell>
                                                        <div className="flex items-center gap-1 text-green-600 font-semibold">
                                                            <DollarSign className="w-4 h-4" />
                                                            {formatCurrency(commission)}
                                                        </div>
                                                    </TableCell>
                                                )}
                                                <TableCell>
                                                    <Badge className={statusConfig.color}>
                                                        <StatusIcon className="w-3 h-3 mr-1" />
                                                        {statusConfig.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {isBasicAdmin && isUnassigned && order.status === 'pending' ? (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleClaimOrder(order)}
                                                            disabled={isProcessing}
                                                            className="bg-green-600 hover:bg-green-700"
                                                        >
                                                            <CheckCircle className="w-4 h-4 mr-1" />
                                                            Ambil Order
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleViewDetail(order)}
                                                        >
                                                            <Eye className="w-4 h-4 mr-1" />
                                                            Detail
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </motion.tr>
                                        );
                                    })}
                                </AnimatePresence>
                            </TableBody>
                        </Table>
                    </div>

                    {filteredOrders.length === 0 && (
                        <div className="text-center py-12">
                            <ShoppingCart className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                            <p className="text-gray-600 dark:text-gray-400">
                                {filterStatus === 'all' ? 'Belum ada pesanan' : `Tidak ada pesanan dengan status "${getStatusBadge(filterStatus).label}"`}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Order Detail Modal */}
            <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Detail Pesanan #{selectedOrder?.id?.slice(0, 8)}</DialogTitle>
                    </DialogHeader>

                    {selectedOrder && (
                        <div className="space-y-6">
                            {/* Commission Preview for Basic Admin */}
                            {isBasicAdmin && selectedOrder.preview_commission > 0 && (
                                <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                                    <DollarSign className="w-4 h-4 text-green-600" />
                                    <AlertDescription>
                                        <p className="font-semibold text-green-800 dark:text-green-200">
                                            Komisi Anda: {formatCurrency(selectedOrder.preview_commission)}
                                        </p>
                                        <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                                            Anda akan mendapat komisi ini setelah menyelesaikan pesanan
                                        </p>
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* Customer Info */}
                            <div className="grid md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <div>
                                    <Label className="text-xs text-gray-500">Customer</Label>
                                    <p className="font-medium">{selectedOrder.customer_name}</p>
                                    <p className="text-sm text-gray-500">{selectedOrder.customer_email}</p>
                                </div>
                                <div>
                                    <Label className="text-xs text-gray-500">Produk</Label>
                                    <p className="font-medium">{selectedOrder.product_name}</p>
                                    <p className="text-lg font-bold text-blue-600">{formatCurrency(selectedOrder.final_price)}</p>
                                </div>
                            </div>

                            {/* Order Data from Customer */}
                            <div className="border rounded-lg p-4 bg-white dark:bg-gray-900">
                                <h4 className="font-semibold mb-3 flex items-center gap-2">
                                    📋 Data Pesanan Customer
                                </h4>
                                {selectedOrder.order_data && Object.entries(selectedOrder.order_data).length > 0 ? (
                                    <div className="space-y-3">
                                        {Object.entries(selectedOrder.order_data).map(([key, value]) => (
                                            <div key={key} className="pb-2 border-b last:border-0">
                                                <Label className="text-xs text-gray-500 uppercase">{key.replace(/_/g, ' ')}</Label>
                                                {typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://')) ? (
                                                    <a 
                                                        href={value} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        className="text-blue-600 hover:underline flex items-center gap-1 text-sm mt-1"
                                                    >
                                                        <Download className="w-3 h-3" />
                                                        Lihat/Download File
                                                    </a>
                                                ) : (
                                                    <p className="text-sm mt-1 whitespace-pre-wrap">{value}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500">Tidak ada data pesanan tambahan</p>
                                )}
                            </div>

                            {/* Admin Section - Update Status */}
                            {(isBasicAdmin && selectedOrder.assigned_to_admin === currentUser.email) || !isBasicAdmin ? (
                                <div className="space-y-4">
                                    <div>
                                        <Label>Status Pesanan</Label>
                                        <Select value={status} onValueChange={setStatus}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="pending">Menunggu</SelectItem>
                                                <SelectItem value="processing">Diproses</SelectItem>
                                                <SelectItem value="completed">Selesai</SelectItem>
                                                <SelectItem value="cancelled">Dibatalkan</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <Label>Catatan Admin untuk Customer</Label>
                                        <Textarea 
                                            value={adminNotes} 
                                            onChange={(e) => setAdminNotes(e.target.value)} 
                                            placeholder="Tambahkan catatan atau instruksi untuk customer..."
                                            rows={3}
                                        />
                                    </div>

                                    <div>
                                        <Label>Upload File Hasil Pekerjaan</Label>
                                        <Input 
                                            type="file" 
                                            onChange={(e) => {
                                                const file = e.target.files[0];
                                                if (file) handleFileUpload(file);
                                            }}
                                            className="mb-2"
                                        />
                                        {resultFiles.length > 0 && (
                                            <div className="space-y-2 mt-3">
                                                <p className="text-sm font-medium">File yang akan dikirim:</p>
                                                {resultFiles.map((url, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                                                            <Download className="w-3 h-3" />
                                                            File {idx + 1}
                                                        </a>
                                                        <Button 
                                                            size="sm" 
                                                            variant="ghost" 
                                                            onClick={() => handleRemoveFile(idx)}
                                                            className="h-6 w-6 p-0"
                                                        >
                                                            <Trash2 className="w-3 h-3 text-red-500" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <Button 
                                        onClick={handleUpdateOrder} 
                                        disabled={isProcessing} 
                                        className="w-full"
                                    >
                                        {isProcessing ? "Menyimpan..." : "Simpan & Kirim Notifikasi"}
                                    </Button>
                                </div>
                            ) : (
                                <Alert>
                                    <AlertDescription>
                                        Pesanan ini sedang diproses oleh admin lain.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
