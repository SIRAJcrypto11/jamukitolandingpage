
import React, { useState } from 'react';
import { User } from '@/entities/User';
import { Notification as NotificationEntity } from '@/entities/Notification'; // FIX: Rename import to avoid conflict
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Megaphone, Send, Sparkles, AlertTriangle, PartyPopper, Loader2, BellRing } from 'lucide-react';

const templates = [
    {
        id: 'new_feature',
        label: 'Fitur Baru',
        icon: PartyPopper,
        title: '🚀 Fitur Baru Telah Hadir!',
        message: 'Hai {nama_pengguna},\n\nKami baru saja merilis fitur baru yang luar biasa! Cek sekarang untuk meningkatkan produktivitas Anda.\n\nSalam,\nTim TODOIT',
    },
    {
        id: 'promo',
        label: 'Promo Spesial',
        icon: Sparkles,
        title: '✨ Penawaran Spesial Untuk Anda!',
        message: 'Hai {nama_pengguna},\n\nDapatkan diskon spesial untuk upgrade ke paket Pro/Advanced. Penawaran terbatas!\n\nSalam,\nTim TODOIT',
    },
    {
        id: 'maintenance',
        label: 'Info Pemeliharaan',
        icon: AlertTriangle,
        title: '🔧 Info Pemeliharaan Terjadwal',
        message: 'Hai {nama_pengguna},\n\nKami akan melakukan pemeliharaan sistem untuk meningkatkan layanan. Aplikasi mungkin tidak dapat diakses sementara waktu.\n\nTerima kasih atas pengertiannya,\nTim TODOIT',
    }
];

export default function BroadcastTab() {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [url, setUrl] = useState('');
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    const [totalUsers, setTotalUsers] = useState(0);

    React.useEffect(() => {
        const fetchUserCount = async () => {
            const users = await User.list();
            setTotalUsers(users.length);
        };
        fetchUserCount();
    }, []);

    const handleUseTemplate = (template) => {
        setTitle(template.title);
        setMessage(template.message);
    };

    const handleBroadcast = async () => {
        if (!title.trim() || !message.trim()) {
            toast.error("Judul dan Pesan tidak boleh kosong.");
            return;
        }

        if (!confirm(`Anda akan mengirim notifikasi ini ke ${totalUsers} pengguna. Lanjutkan?`)) {
            return;
        }

        setIsBroadcasting(true);
        toast.info("Memulai proses broadcast...", {
            description: `Mengirim ke ${totalUsers} pengguna.`,
        });

        try {
            const allUsers = await User.list();
            
            // Batch creation for performance
            const notificationPromises = allUsers.map(user => {
                const personalizedMessage = message.replace('{nama_pengguna}', user.full_name || 'Pengguna');
                return NotificationEntity.create({ // FIX: Use the renamed entity
                    user_id: user.email,
                    title: title,
                    message: personalizedMessage,
                    url: url || '/dashboard',
                });
            });

            await Promise.all(notificationPromises);

            toast.success("Broadcast berhasil terkirim!", {
                description: `Notifikasi telah dikirim ke ${allUsers.length} pengguna.`,
            });

            // Reset form
            setTitle('');
            setMessage('');
            setUrl('');

        } catch (error) {
            toast.error("Gagal mengirim broadcast.", {
                description: "Terjadi kesalahan pada server. Silakan coba lagi.",
            });
            console.error("Broadcast failed:", error);
        } finally {
            setIsBroadcasting(false);
        }
    };

    const handleTestNotification = () => {
        // FIX: Use window.Notification explicitly to refer to the browser's Notification API
        if (!('Notification' in window)) {
            toast.error("Browser ini tidak mendukung notifikasi desktop.");
            return;
        }

        const sendTestNotification = () => {
            const notification = new window.Notification('🔔 Tes Notifikasi TODOIT', {
                body: 'Jika Anda melihat ini, notifikasi berhasil dikonfigurasi!',
                icon: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/688a42916670b89e7b51038c/bf4ff089b_TODOITLOGO.png'
            });
            
            // Play sound
            const sound = new Audio('https://cdn.jsdelivr.net/gh/scottschiller/SoundManager2@master/demo/_mp3/blip.mp3');
            sound.play().catch(e => console.error("Error playing sound for test notification:", e));
        };

        if (window.Notification.permission === 'granted') {
            sendTestNotification();
        } else if (window.Notification.permission !== 'denied') {
            window.Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    sendTestNotification();
                } else {
                    toast.warning("Anda telah menolak izin notifikasi.");
                }
            });
        } else {
            toast.error("Izin notifikasi telah ditolak. Harap aktifkan dari pengaturan browser Anda.");
        }
    };


    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Megaphone /> Kirim Broadcast Notifikasi
                    </CardTitle>
                    <CardDescription>
                        Kirim pemberitahuan penting, promosi, atau update ke seluruh pengguna. ({totalUsers} pengguna aktif)
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <Label className="font-semibold">Gunakan Template Cepat</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {templates.map(template => (
                                <Button key={template.id} variant="outline" size="sm" onClick={() => handleUseTemplate(template)}>
                                    <template.icon className="w-4 h-4 mr-2" />
                                    {template.label}
                                </Button>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">Gunakan `&#123;nama_pengguna&#125;` untuk personalisasi pesan.</p>
                    </div>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="broadcast-title">Judul Notifikasi</Label>
                            <Input 
                                id="broadcast-title" 
                                value={title} 
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Contoh: ✨ Fitur Baru: Laporan Keuangan!"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="broadcast-message">Pesan Notifikasi</Label>
                            <Textarea 
                                id="broadcast-message" 
                                value={message} 
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Jelaskan detail pengumuman Anda di sini..."
                                rows={6}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="broadcast-url">URL Tujuan (Opsional)</Label>
                            <Input 
                                id="broadcast-url" 
                                type="url"
                                value={url} 
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="Contoh: /pricing atau https://blog.anda.com/..."
                            />
                        </div>
                    </div>
                    <Button onClick={handleBroadcast} disabled={isBroadcasting} size="lg" className="w-full">
                        {isBroadcasting ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Mengirim...
                            </>
                        ) : (
                            <>
                                <Send className="w-5 h-5 mr-2" />
                                Kirim Broadcast ke {totalUsers} Pengguna
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BellRing /> Uji Coba Notifikasi
                    </CardTitle>
                    <CardDescription>
                        Kirim notifikasi tes ke browser Anda untuk memastikan sistem berfungsi dengan benar.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleTestNotification}>
                        <Send className="w-5 h-5 mr-2" />
                        Kirim Notifikasi Tes
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
