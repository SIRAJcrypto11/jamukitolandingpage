import { useState, useEffect } from 'react';
import { ShopSettings } from '@/entities/ShopSettings';
import { UploadFile } from '@/integrations/Core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Store, Image as ImageIcon, Tag, Percent } from 'lucide-react';

export default function ShopSettingsTab() {
    const [settings, setSettings] = useState({
        setting_key: 'main',
        banner_image_url: '',
        banner_title: 'Digital Store TODOIT',
        banner_subtitle: 'Produk digital berkualitas dengan harga terjangkau',
        promo_banner: {
            active: false,
            title: 'Promo Spesial!',
            description: 'Dapatkan discount untuk semua produk',
            discount_percentage: 10,
            valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        },
        reseller_discounts: {
            free: 0,
            pro: 0.05,
            business: 0.1,
            advanced: 0.15,
            enterprise: 0.2
        }
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const data = await ShopSettings.filter({ setting_key: 'main' });
            if (data.length > 0) {
                setSettings(data[0]);
            }
        } catch (error) {
            console.error("Error loading shop settings:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleBannerUpload = async (file) => {
        try {
            toast.info("Mengunggah banner...");
            const { file_url } = await UploadFile({ file });
            setSettings(prev => ({ ...prev, banner_image_url: file_url }));
            toast.success("Banner berhasil diunggah");
        } catch (error) {
            toast.error("Gagal mengunggah banner");
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            if (settings.id) {
                await ShopSettings.update(settings.id, settings);
                toast.success("Pengaturan toko berhasil diperbarui");
            } else {
                await ShopSettings.create(settings);
                toast.success("Pengaturan toko berhasil dibuat");
            }
            loadSettings();
        } catch (error) {
            toast.error("Gagal menyimpan pengaturan");
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="flex items-center justify-center p-12">Loading...</div>;
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Store className="w-5 h-5" />
                        Pengaturan Toko Digital
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Banner Settings */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <ImageIcon className="w-5 h-5" />
                            Banner Toko
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <Label>Judul Banner</Label>
                                <Input
                                    value={settings.banner_title}
                                    onChange={(e) => setSettings({ ...settings, banner_title: e.target.value })}
                                    placeholder="Digital Store TODOIT"
                                />
                            </div>
                            <div>
                                <Label>Subtitle Banner</Label>
                                <Input
                                    value={settings.banner_subtitle}
                                    onChange={(e) => setSettings({ ...settings, banner_subtitle: e.target.value })}
                                    placeholder="Produk digital berkualitas"
                                />
                            </div>
                        </div>
                        <div>
                            <Label>Upload Banner (Rekomendasi: 1920x400px)</Label>
                            <Input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (file) handleBannerUpload(file);
                                }}
                            />
                            {settings.banner_image_url && (
                                <img
                                    src={settings.banner_image_url}
                                    alt="Banner Preview"
                                    className="mt-3 w-full max-w-md rounded-lg border"
                                />
                            )}
                        </div>
                    </div>

                    {/* Promo Banner */}
                    <div className="space-y-4 pt-6 border-t">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Tag className="w-5 h-5" />
                            Banner Promo
                        </h3>
                        <div className="flex items-center gap-2">
                            <Switch
                                checked={settings.promo_banner?.active || false}
                                onCheckedChange={(checked) => setSettings({
                                    ...settings,
                                    promo_banner: { ...settings.promo_banner, active: checked }
                                })}
                            />
                            <Label>Aktifkan Banner Promo</Label>
                        </div>
                        {settings.promo_banner?.active && (
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <Label>Judul Promo</Label>
                                    <Input
                                        value={settings.promo_banner.title}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            promo_banner: { ...settings.promo_banner, title: e.target.value }
                                        })}
                                    />
                                </div>
                                <div>
                                    <Label>Persentase Discount (%)</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={settings.promo_banner.discount_percentage}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            promo_banner: { ...settings.promo_banner, discount_percentage: Number(e.target.value) }
                                        })}
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <Label>Deskripsi Promo</Label>
                                    <Textarea
                                        value={settings.promo_banner.description}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            promo_banner: { ...settings.promo_banner, description: e.target.value }
                                        })}
                                    />
                                </div>
                                <div>
                                    <Label>Berlaku Hingga</Label>
                                    <Input
                                        type="datetime-local"
                                        value={settings.promo_banner.valid_until?.slice(0, 16)}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            promo_banner: { ...settings.promo_banner, valid_until: new Date(e.target.value).toISOString() }
                                        })}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Reseller Discounts */}
                    <div className="space-y-4 pt-6 border-t">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Percent className="w-5 h-5" />
                            Discount Reseller per Membership
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            User dengan membership otomatis mendapat discount sesuai tier (1-80%)
                        </p>
                        <div className="grid md:grid-cols-2 gap-4">
                            {Object.entries(settings.reseller_discounts || {}).map(([tier, value]) => (
                                <div key={tier} className="flex items-center gap-3">
                                    <Label className="w-32 capitalize">{tier}:</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="80"
                                        step="1"
                                        value={(value * 100).toFixed(0)}
                                        onChange={(e) => {
                                            const percentage = Number(e.target.value);
                                            setSettings({
                                                ...settings,
                                                reseller_discounts: {
                                                    ...settings.reseller_discounts,
                                                    [tier]: Math.min(0.8, Math.max(0, percentage / 100))
                                                }
                                            });
                                        }}
                                        className="w-24"
                                    />
                                    <span className="text-sm text-gray-500">%</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <Button onClick={handleSave} disabled={isSaving} className="w-full">
                        {isSaving ? "Menyimpan..." : "Simpan Pengaturan Toko"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}