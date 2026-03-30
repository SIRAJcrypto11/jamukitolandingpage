import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import {
  ShoppingCart,
  Package,
  Info,
  CheckCircle,
  X,
  Loader2,
  CreditCard } from
'lucide-react';
import { toast } from 'sonner';

const formatCurrency = (amount) => `Rp ${Number(amount || 0).toLocaleString('id-ID')}`;

export default function ProductDetailModal({ product, isOpen, onClose, currentUser, companyData }) {
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  const handleAddToCart = async () => {
    if (!currentUser) {
      toast.error('Silakan login terlebih dahulu');
      window.location.href = createPageUrl('Login');
      return;
    }


    try {
      setAdding(true);

      // Check if already in cart
      const existingCart = await base44.entities.ShoppingCart.filter({
        user_id: currentUser.id,
        product_id: product.id
      });

      if (existingCart && existingCart.length > 0) {
        // Update quantity
        await base44.entities.ShoppingCart.update(existingCart[0].id, {
          quantity: existingCart[0].quantity + quantity
        });
      } else {
        // Add new
        await base44.entities.ShoppingCart.create({
          user_id: currentUser.id,
          company_id: product.company_id,
          product_id: product.id,
          product_name: product.name,
          product_image: product.image_url,
          price: product.price,
          quantity: quantity
        });
      }

      window.dispatchEvent(new Event('cartUpdated'));
      toast.success('Produk ditambahkan ke keranjang');
      onClose();
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Gagal menambahkan ke keranjang');
    } finally {
      setAdding(false);
    }
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              Detail Produk
            </span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Product Image */}
          {product.image_url &&
          <div className="w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
              <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover" />

            </div>
          }

          {/* Product Info */}
          <div>
            <h2 className="text-2xl font-bold mb-2">{product.name}</h2>
            {product.category &&
            <Badge className="mb-3">{product.category}</Badge>
            }
            <p className="text-3xl font-bold text-green-600 mb-4">
              {formatCurrency(product.price)}
            </p>
          </div>

          {/* Description */}
          {product.description &&
          <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-slate-950 mb-2 font-semibold flex items-center gap-2">Deskripsi


            </h3>
              <p className="text-gray-700 whitespace-pre-wrap">{product.description}</p>
            </div>
          }

          {/* Stock Info */}
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm text-gray-600">
              Stok: {product.stock || 'Tersedia'}
            </span>
          </div>

          {/* Company Payment Info */}
          {companyData?.bank_accounts && companyData.bank_accounts.length > 0 &&
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-600" />
                Informasi Pembayaran
              </h3>
              <div className="space-y-2 text-sm">
                {companyData.bank_accounts.map((account, idx) =>
              <div key={idx} className="bg-white p-3 rounded border">
                    <p className="font-medium">{account.bank_name}</p>
                    <p className="text-gray-600">{account.account_number}</p>
                    <p className="text-gray-600">a.n. {account.account_holder}</p>
                  </div>
              )}
              </div>
            </div>
          }

          {/* Quantity Selector */}
          <div>
            <label className="block text-sm font-medium mb-2">Jumlah</label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}>

                -
              </Button>
              <span className="w-16 text-center font-bold text-lg">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(quantity + 1)}>

                +
              </Button>
            </div>
          </div>

          {/* Total */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-2xl font-bold text-green-600">
                {formatCurrency(product.price * quantity)}
              </span>
            </div>
          </div>

          {/* Add to Cart Button */}
          <Button
            className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-lg"
            onClick={handleAddToCart}
            disabled={adding}>

            {adding ?
            <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Menambahkan...
              </> :

            <>
                <ShoppingCart className="w-5 h-5 mr-2" />
                Tambah ke Keranjang
              </>
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>);

}