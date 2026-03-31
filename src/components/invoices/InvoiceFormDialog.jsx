import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { base44 } from '@/api/base44Client';
const { Invoice } = base44.entities;
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function InvoiceFormDialog({ open, onOpenChange, invoice, company, customers, onSuccess }) {
  const [formData, setFormData] = useState({
    invoice_number: '',
    invoice_type: 'invoice',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_address: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: '',
    items: [{ description: '', quantity: 1, unit_price: 0, total: 0 }],
    subtotal: 0,
    tax_percentage: 0,
    tax_amount: 0,
    discount_percentage: 0,
    discount_amount: 0,
    total: 0,
    notes: '',
    terms: 'Pembayaran dalam 7 hari'
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      if (invoice) {
        setFormData({
          ...invoice,
          items: invoice.items || [{ description: '', quantity: 1, unit_price: 0, total: 0 }]
        });
      } else {
        // Generate invoice number
        generateInvoiceNumber();
      }
    }
  }, [open, invoice]);

  const generateInvoiceNumber = async () => {
    try {
      const existingInvoices = await Invoice.filter({ company_id: company.id });
      const count = existingInvoices.length + 1;
      const invNumber = `INV-${company.name.substring(0, 3).toUpperCase()}-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(count).padStart(4, '0')}`;

      setFormData(prev => ({
        ...prev,
        invoice_number: invNumber
      }));
    } catch (error) {
      console.error('Error generating invoice number:', error);
    }
  };

  const calculateTotals = (items, taxPercentage, discountPercentage) => {
    const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
    const taxAmount = (subtotal * (taxPercentage || 0)) / 100;
    const discountAmount = (subtotal * (discountPercentage || 0)) / 100;
    const total = subtotal + taxAmount - discountAmount;

    setFormData(prev => ({
      ...prev,
      items,
      subtotal,
      tax_amount: taxAmount,
      discount_amount: discountAmount,
      total
    }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;

    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total = newItems[index].quantity * newItems[index].unit_price;
    }

    calculateTotals(newItems, formData.tax_percentage, formData.discount_percentage);
  };

  const addItem = () => {
    const newItems = [...formData.items, { description: '', quantity: 1, unit_price: 0, total: 0 }];
    calculateTotals(newItems, formData.tax_percentage, formData.discount_percentage);
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    calculateTotals(newItems, formData.tax_percentage, formData.discount_percentage);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.customer_name || formData.items.length === 0) {
      toast.error('Lengkapi data invoice');
      return;
    }

    setIsLoading(true);

    try {
      const dataToSave = {
        ...formData,
        company_id: company.id
      };

      if (invoice) {
        await Invoice.update(invoice.id, dataToSave);
        toast.success('Invoice berhasil diupdate');
      } else {
        await Invoice.create(dataToSave);
        toast.success('Invoice berhasil dibuat');
      }

      if (onSuccess) {
        onSuccess();
      }

      onOpenChange(false);

    } catch (error) {
      console.error('Error saving invoice:', error);
      toast.error('Gagal menyimpan invoice');
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('id-ID').format(price);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">
            {invoice ? 'Edit Invoice' : 'Buat Invoice Baru'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-300">Nomor Invoice</Label>
              <Input
                value={formData.invoice_number}
                onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                className="bg-gray-800 border-gray-700 text-white"
                required
              />
            </div>

            <div>
              <Label className="text-gray-300">Tipe</Label>
              <Select
                value={formData.invoice_type}
                onValueChange={(value) => setFormData({ ...formData, invoice_type: value })}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoice">Invoice</SelectItem>
                  <SelectItem value="quotation">Quotation</SelectItem>
                  <SelectItem value="proforma">Proforma</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-gray-300">Tanggal Terbit</Label>
              <Input
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                className="bg-gray-800 border-gray-700 text-white"
                required
              />
            </div>

            <div>
              <Label className="text-gray-300">Jatuh Tempo</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="bg-gray-800 border-gray-700 text-white"
                required
              />
            </div>
          </div>

          {/* Customer Info */}
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4 space-y-4">
              <h3 className="font-bold text-white">Informasi Customer</h3>

              <div>
                <Label className="text-gray-300">Nama Customer</Label>
                <Input
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Email</Label>
                  <Input
                    type="email"
                    value={formData.customer_email}
                    onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Telepon</Label>
                  <Input
                    value={formData.customer_phone}
                    onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>

              <div>
                <Label className="text-gray-300">Alamat</Label>
                <Textarea
                  value={formData.customer_address}
                  onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
                  rows={2}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-white">Item Invoice</h3>
                <Button type="button" onClick={addItem} size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Tambah Item
                </Button>
              </div>

              {formData.items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-5">
                    <Input
                      placeholder="Deskripsi"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className="bg-gray-700 border-gray-600 text-white"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      placeholder="Harga"
                      value={item.unit_price}
                      onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="bg-gray-700 border-gray-600 text-white"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      value={formatPrice(item.total)}
                      readOnly
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div className="col-span-1">
                    {formData.items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Totals */}
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-300">Subtotal:</span>
                <span className="text-white font-bold">Rp {formatPrice(formData.subtotal)}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Pajak (%)</Label>
                  <Input
                    type="number"
                    value={formData.tax_percentage}
                    onChange={(e) => {
                      const taxPercentage = parseFloat(e.target.value) || 0;
                      setFormData({ ...formData, tax_percentage: taxPercentage });
                      calculateTotals(formData.items, taxPercentage, formData.discount_percentage);
                    }}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Diskon (%)</Label>
                  <Input
                    type="number"
                    value={formData.discount_percentage}
                    onChange={(e) => {
                      const discountPercentage = parseFloat(e.target.value) || 0;
                      setFormData({ ...formData, discount_percentage: discountPercentage });
                      calculateTotals(formData.items, formData.tax_percentage, discountPercentage);
                    }}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-between text-lg border-t border-gray-700 pt-3">
                <span className="text-white font-bold">TOTAL:</span>
                <span className="text-green-400 font-bold text-2xl">
                  Rp {formatPrice(formData.total)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Notes & Terms */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-300">Catatan</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div>
              <Label className="text-gray-300">Syarat & Ketentuan</Label>
              <Textarea
                value={formData.terms}
                onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                rows={3}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-gray-600">
              Batal
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan Invoice'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}