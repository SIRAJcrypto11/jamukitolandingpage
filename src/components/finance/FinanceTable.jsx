import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Receipt } from 'lucide-react';
import { format } from 'date-fns';

export default function FinanceTable({ records, onEdit, onDelete, canEdit }) {
  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-white text-sm sm:text-base">Riwayat Transaksi</CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        {/* Mobile View - Stacked Cards */}
        <div className="block sm:hidden space-y-2">
          {records.map((record) => (
            <Card key={record.id} className="bg-gray-800 border-gray-700">
              <CardContent className="p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{record.description}</p>
                    <p className="text-xs text-gray-400 truncate">{record.category}</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(record.date), 'dd MMM yyyy')}
                    </p>
                  </div>
                  <Badge className={record.type === 'income' ? 'bg-green-600' : 'bg-red-600'}>
                    {record.type === 'income' ? 'Masuk' : 'Keluar'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                  <p className={`font-bold text-base ${record.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    Rp {Number(record.amount).toLocaleString('id-ID')}
                  </p>
                  {canEdit && record.source !== 'pos' && (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => onEdit(record)} className="h-7 w-7">
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => onDelete(record.id)} className="h-7 w-7 text-red-400">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                  {record.source === 'pos' && (
                    <Badge variant="outline" className="text-xs">
                      <Receipt className="w-3 h-3 mr-1" />
                      POS
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Desktop View - Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left p-3 text-gray-400 text-sm">Tanggal</th>
                <th className="text-left p-3 text-gray-400 text-sm">Deskripsi</th>
                <th className="text-left p-3 text-gray-400 text-sm">Kategori</th>
                <th className="text-left p-3 text-gray-400 text-sm">Tipe</th>
                <th className="text-right p-3 text-gray-400 text-sm">Jumlah</th>
                {canEdit && <th className="text-center p-3 text-gray-400 text-sm">Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                  <td className="p-3 text-gray-300 text-sm">
                    {format(new Date(record.date), 'dd MMM yyyy')}
                  </td>
                  <td className="p-3 text-white text-sm">{record.description}</td>
                  <td className="p-3 text-gray-400 text-sm">{record.category}</td>
                  <td className="p-3">
                    <Badge className={record.type === 'income' ? 'bg-green-600' : 'bg-red-600'}>
                      {record.type === 'income' ? 'Masuk' : 'Keluar'}
                    </Badge>
                    {record.source === 'pos' && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        <Receipt className="w-3 h-3 mr-1" />
                        POS
                      </Badge>
                    )}
                  </td>
                  <td className={`p-3 text-right font-bold text-sm ${record.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    Rp {Number(record.amount).toLocaleString('id-ID')}
                  </td>
                  {canEdit && (
                    <td className="p-3 text-center">
                      {record.source !== 'pos' ? (
                        <div className="flex justify-center gap-2">
                          <Button size="icon" variant="ghost" onClick={() => onEdit(record)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => onDelete(record.id)} className="text-red-400">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">Auto</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {records.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            Belum ada transaksi
          </div>
        )}
      </CardContent>
    </Card>
  );
}