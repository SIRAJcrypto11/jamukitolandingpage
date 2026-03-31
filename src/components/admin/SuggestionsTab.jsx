import { useState } from 'react';
import { Suggestion } from '@/entities/Suggestion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Lightbulb, Eye, Clock, Search, Check, ThumbsUp, X } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { toast } from 'sonner';

export default function SuggestionsTab({ suggestions, onSuggestionUpdate }) {
    const [selectedSuggestion, setSelectedSuggestion] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleStatusChange = async (suggestionId, newStatus) => {
        setIsProcessing(true);
        try {
            await Suggestion.update(suggestionId, { status: newStatus });
            toast.success("Status saran berhasil diperbarui!");
            onSuggestionUpdate();
        } catch (error) {
            toast.error("Gagal memperbarui status.");
            console.error(error);
        } finally {
            setIsProcessing(false);
        }
    };

    const statusConfig = {
        new: { label: 'Baru', color: 'bg-blue-100 text-blue-800', icon: Clock },
        reviewing: { label: 'Ditinjau', color: 'bg-yellow-100 text-yellow-800', icon: Search },
        planned: { label: 'Direncanakan', color: 'bg-purple-100 text-purple-800', icon: Check },
        implemented: { label: 'Diimplementasi', color: 'bg-green-100 text-green-800', icon: ThumbsUp },
        rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-800', icon: X }
    };

    const priorityColors = {
        low: 'bg-gray-200 text-gray-800',
        medium: 'bg-yellow-200 text-yellow-900',
        high: 'bg-orange-200 text-orange-900',
        critical: 'bg-red-200 text-red-900'
    };

    return (
        <>
            <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Lightbulb /> Manajemen Saran Pengguna ({suggestions.length})
                    </CardTitle>
                    <CardDescription className="text-gray-400">Tinjau dan kelola ide-ide dari komunitas.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto border rounded-lg border-gray-700">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-gray-700">
                                    <TableHead className="text-gray-300">Pengirim</TableHead>
                                    <TableHead className="text-gray-300">Judul</TableHead>
                                    <TableHead className="text-gray-300">Prioritas</TableHead>
                                    <TableHead className="text-gray-300">Tanggal</TableHead>
                                    <TableHead className="text-gray-300">Status</TableHead>
                                    <TableHead className="text-gray-300">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {suggestions.map(suggestion => (
                                    <TableRow key={suggestion.id} className="border-gray-700 hover:bg-gray-700/50">
                                        <TableCell>
                                            <div className="font-medium text-white">{suggestion.user_full_name}</div>
                                            <div className="text-sm text-gray-400">{suggestion.user_email}</div>
                                        </TableCell>
                                        <TableCell className="text-white">{suggestion.title}</TableCell>
                                        <TableCell>
                                            <Badge className={priorityColors[suggestion.priority]}>{suggestion.priority}</Badge>
                                        </TableCell>
                                        <TableCell className="text-gray-300">
                                            {format(new Date(suggestion.created_date), 'dd MMM yyyy', { locale: id })}
                                        </TableCell>
                                        <TableCell>
                                            <Select
                                                defaultValue={suggestion.status}
                                                onValueChange={(newStatus) => handleStatusChange(suggestion.id, newStatus)}
                                                disabled={isProcessing}
                                            >
                                                <SelectTrigger className="w-40 bg-gray-700 border-gray-600 text-white">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Object.entries(statusConfig).map(([key, { label }]) => (
                                                        <SelectItem key={key} value={key}>{label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setSelectedSuggestion(suggestion)}
                                                className="border-gray-600 text-gray-300 hover:bg-gray-700"
                                            >
                                                <Eye className="w-4 h-4 mr-2" /> Detail
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                         {suggestions.length === 0 && (
                            <div className="text-center py-8 text-gray-400">
                                <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>Belum ada saran yang masuk.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Dialog open={!!selectedSuggestion} onOpenChange={() => setSelectedSuggestion(null)}>
                <DialogContent className="max-w-2xl bg-gray-800 border-gray-700">
                    <DialogHeader>
                        <DialogTitle className="text-white">{selectedSuggestion?.title}</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Dikirim oleh {selectedSuggestion?.user_full_name} pada {selectedSuggestion && format(new Date(selectedSuggestion.created_date), 'dd MMMM yyyy', { locale: id })}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedSuggestion && (
                        <div className="space-y-4 text-gray-300 max-h-[60vh] overflow-y-auto pr-4">
                            <div className="flex gap-4">
                                <Badge className={priorityColors[selectedSuggestion.priority]}>Prioritas: {selectedSuggestion.priority}</Badge>
                                <Badge className="bg-gray-600">Kategori: {selectedSuggestion.category || 'Umum'}</Badge>
                            </div>
                            <p>{selectedSuggestion.description}</p>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}