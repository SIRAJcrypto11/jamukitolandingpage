import { useState, useEffect } from 'react';
import { Changelog } from '@/lib/changelog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { PlusCircle, Edit, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export default function ChangelogTab() {
    const [changelogs, setChangelogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState(null);

    const fetchChangelogs = async () => {
        setIsLoading(true);
        try {
            const data = await Changelog.list('-release_date');
            setChangelogs(data);
        } catch (error) {
            toast.error("Gagal memuat data changelog.");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchChangelogs();
    }, []);

    const handleOpenDialog = (entry = null) => {
        setEditingEntry(entry || {
            version: '',
            title: '',
            description: '',
            release_date: new Date().toISOString(),
            tags: [],
            is_published: true,
            type: 'manual'
        });
        setIsDialogOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const dataToSave = {
                ...editingEntry,
                tags: typeof editingEntry.tags === 'string' ? editingEntry.tags.split(',').map(t => t.trim()) : editingEntry.tags,
                release_date: new Date(editingEntry.release_date).toISOString()
            };

            if (editingEntry.id) {
                await Changelog.update(editingEntry.id, dataToSave);
                toast.success("Catatan pembaruan berhasil diperbarui.");
            } else {
                await Changelog.create(dataToSave);
                toast.success("Catatan pembaruan berhasil ditambahkan.");
            }
            setIsDialogOpen(false);
            setEditingEntry(null);
            fetchChangelogs();
        } catch (error) {
            toast.error("Gagal menyimpan catatan pembaruan.");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (entryId) => {
        if (confirm("Apakah Anda yakin ingin menghapus entri ini?")) {
            setIsLoading(true);
            try {
                await Changelog.delete(entryId);
                toast.success("Entri berhasil dihapus.");
                fetchChangelogs();
            } catch (error) {
                toast.error("Gagal menghapus entri.");
            } finally {
                setIsLoading(false);
            }
        }
    };

    const modules = {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike', 'blockquote'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
            ['link', 'image'],
            ['clean']
        ],
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Kelola Pembaruan Aplikasi (Changelog)</CardTitle>
                <Button size="sm" onClick={() => handleOpenDialog()}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Tambah Manual
                </Button>
            </CardHeader>
            <CardContent>
                {isLoading && !isDialogOpen ? (
                    <Loader2 className="animate-spin" />
                ) : (
                    <div className="space-y-4">
                        {changelogs.map(entry => (
                            <div key={entry.id} className="p-4 border rounded-lg flex justify-between items-start">
                                <div>
                                    <h4 className="font-bold">{entry.title}</h4>
                                    <p className="text-sm text-muted-foreground">
                                        {format(new Date(entry.release_date), 'dd MMMM yyyy, HH:mm', { locale: id })}
                                        <Badge variant={entry.type === 'automatic' ? 'secondary' : 'outline'} className="ml-2">{entry.type}</Badge>
                                    </p>
                                    <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: entry.description }} />
                                    <div className="mt-2 flex gap-2">
                                        {(entry.tags || []).map(tag => <Badge key={tag}>{tag}</Badge>)}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(entry)}><Edit className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(entry.id)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{editingEntry?.id ? 'Edit' : 'Tambah'} Catatan Pembaruan</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                        <div><Label>Judul</Label><Input value={editingEntry?.title || ''} onChange={e => setEditingEntry({ ...editingEntry, title: e.target.value })} required /></div>
                        <div><Label>Versi (Opsional)</Label><Input value={editingEntry?.version || ''} onChange={e => setEditingEntry({ ...editingEntry, version: e.target.value })} /></div>
                        <div>
                            <Label>Deskripsi</Label>
                            <ReactQuill
                                theme="snow"
                                value={editingEntry?.description || ''}
                                onChange={val => setEditingEntry({ ...editingEntry, description: val })}
                                modules={modules}
                                className="bg-white dark:bg-gray-800"
                            />
                        </div>
                        <div><Label>Tanggal Rilis</Label><Input type="datetime-local" value={editingEntry?.release_date ? format(new Date(editingEntry.release_date), "yyyy-MM-dd'T'HH:mm") : ''} onChange={e => setEditingEntry({ ...editingEntry, release_date: e.target.value })} required /></div>
                        <div><Label>Tags (pisahkan dengan koma)</Label><Input value={(editingEntry?.tags || []).join(', ')} onChange={e => setEditingEntry({ ...editingEntry, tags: e.target.value })} /></div>
                        <div className="flex items-center space-x-2"><Switch checked={editingEntry?.is_published || false} onCheckedChange={c => setEditingEntry({ ...editingEntry, is_published: c })} /> <Label>Publikasikan</Label></div>
                        <DialogFooter>
                            <Button variant="ghost" type="button" onClick={() => setIsDialogOpen(false)}>Batal</Button>
                            <Button type="submit" disabled={isLoading}>{isLoading ? <Loader2 className="animate-spin" /> : 'Simpan'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </Card>
    );
}