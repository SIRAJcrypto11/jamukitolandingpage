import { useState, useEffect, useMemo } from 'react';
import { initialProducts } from '../data/initialProducts';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Search, ShoppingCart, Leaf, MessageCircle, X, Plus, Minus,
  Package, ChevronLeft, Filter
} from 'lucide-react';

const COMPANY_ID = '694cc38feacdffcc010f0d60';
const WA_NUMBER = '6285279207959';
const CART_KEY = 'jk_katalog_cart';

const formatRp = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

export default function KatalogPage() {
  // Instant: start with static products — never block on network
  const [products, setProducts] = useState(initialProducts);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch { return []; }
  });
  const [showCart, setShowCart] = useState(false);
  const [detail, setDetail] = useState(null);

  // Background refresh — does not block render
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const live = await base44.entities.CompanyPOSProduct.filter({
          company_id: COMPANY_ID,
          is_active: true,
        });
        if (!cancelled && Array.isArray(live) && live.length > 0) {
          setProducts(live);
        }
      } catch {
        // keep static products
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const okCat = category === 'all' || p.category === category;
      const okQ = !q || (p.name || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
      return okCat && okQ;
    });
  }, [products, search, category]);

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.reduce((s, i) => s + (i.price || 0) * i.qty, 0);

  const addToCart = (product, qty = 1) => {
    setCart((prev) => {
      const found = prev.find((i) => i.id === product.id);
      if (found) return prev.map((i) => (i.id === product.id ? { ...i, qty: i.qty + qty } : i));
      return [...prev, { id: product.id, name: product.name, price: product.price, image_url: product.image_url, qty }];
    });
    toast.success(`${product.name} ditambahkan`, { duration: 1200 });
  };

  const updateQty = (id, qty) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.id !== id));
      return;
    }
    setCart((prev) => prev.map((i) => (i.id === id ? { ...i, qty } : i)));
  };

  const orderViaWA = () => {
    if (cart.length === 0) {
      toast.error('Keranjang masih kosong');
      return;
    }
    const lines = cart.map((i) => '- ' + i.name + ' x' + i.qty + ' = ' + formatRp(i.price * i.qty)).join('\n');
    const msg = 'Halo Jamu Kito International!\n\nSaya ingin memesan dari katalog:\n' + lines + '\n\nTotal: ' + formatRp(cartTotal) + '\n\nMohon konfirmasi ketersediaan. Terima kasih!';
    window.open('https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(msg), '_blank');
  };

  return (
    <div className="min-h-screen bg-[#f7f6f2] text-[#1a2e1d]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0f1f12]/95 backdrop-blur border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <a href="/" className="flex items-center gap-2 text-white">
            <ChevronLeft className="w-4 h-4" />
            <Leaf className="w-5 h-5 text-emerald-400" />
            <div className="leading-tight">
              <div className="font-bold text-sm tracking-wide">JAMU KITO</div>
              <div className="text-[10px] text-amber-300 tracking-widest">INTERNATIONAL</div>
            </div>
          </a>
          <button
            onClick={() => setShowCart(true)}
            className="relative flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold px-3 py-2 rounded-full transition"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">Keranjang</span>
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-black text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-[#0f1f12] to-[#1a3a22] text-white py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <p className="text-amber-300 text-xs tracking-[0.3em] uppercase mb-2">Katalog Produk</p>
          <h1 className="text-3xl sm:text-4xl font-black leading-tight">
            Semua Produk<br />Jamu Kito International
          </h1>
          <p className="text-white/70 mt-2 text-sm max-w-md">
            Pilih produk, masukkan keranjang, lalu pesan langsung via WhatsApp. Tidak perlu login.
          </p>
        </div>
      </section>

      {/* Filters */}
      <div className="sticky top-[57px] z-30 bg-[#f7f6f2]/95 backdrop-blur border-b border-black/5">
        <div className="max-w-6xl mx-auto px-4 py-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari produk..."
              className="pl-9 bg-white border-black/10"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                  category === c
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-gray-600 border border-black/10 hover:border-emerald-400'
                }`}
              >
                {c === 'all' ? 'Semua' : c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid — instant, no skeleton */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4 text-sm text-gray-500">
          <span>{filtered.length} produk</span>
          <span className="flex items-center gap-1 text-emerald-700">
            <Filter className="w-3.5 h-3.5" /> Filter
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
            Tidak ada produk yang cocok.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {filtered.map((p) => (
              <article
                key={p.id}
                className="bg-white rounded-xl overflow-hidden border border-black/5 shadow-sm hover:shadow-md transition flex flex-col"
              >
                <button onClick={() => setDetail(p)} className="aspect-square bg-gray-100 relative">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" loading="eager" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Leaf className="w-10 h-10 text-emerald-300" />
                    </div>
                  )}
                  {p.category && (
                    <Badge className="absolute top-2 left-2 bg-emerald-600/90 text-white text-[10px] border-0">
                      {p.category}
                    </Badge>
                  )}
                </button>
                <div className="p-3 flex flex-col flex-1">
                  <h3 className="font-semibold text-sm line-clamp-2 min-h-[2.5rem]">{p.name}</h3>
                  <p className="text-emerald-700 font-bold text-sm mt-1">{formatRp(p.price)}</p>
                  <Button
                    onClick={() => addToCart(p)}
                    className="mt-2 w-full h-9 text-xs bg-emerald-600 hover:bg-emerald-500"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Tambah
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          {detail && (
            <div>
              <div className="aspect-square bg-gray-100">
                {detail.image_url ? (
                  <img src={detail.image_url} alt={detail.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Leaf className="w-16 h-16 text-emerald-300" />
                  </div>
                )}
              </div>
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-bold text-lg leading-tight">{detail.name}</h2>
                  {detail.category && <Badge className="shrink-0 bg-emerald-600 text-white border-0">{detail.category}</Badge>}
                </div>
                {detail.description && <p className="text-sm text-gray-600">{detail.description}</p>}
                <p className="text-2xl font-black text-emerald-700">{formatRp(detail.price)}</p>
                <Button onClick={() => { addToCart(detail); setDetail(null); }} className="w-full bg-emerald-600 hover:bg-emerald-500">
                  <ShoppingCart className="w-4 h-4 mr-2" /> Tambah ke Keranjang
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cart drawer */}
      <Dialog open={showCart} onOpenChange={setShowCart}>
        <DialogContent className="max-w-md p-0">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-bold flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" /> Keranjang ({cartCount})
            </h2>
            <button onClick={() => setShowCart(false)}><X className="w-5 h-5" /></button>
          </div>
          <div className="max-h-80 overflow-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">Keranjang kosong</p>
            ) : (
              cart.map((i) => (
                <div key={i.id} className="flex gap-3 items-center">
                  <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden shrink-0">
                    {i.image_url && <img src={i.image_url} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1">{i.name}</p>
                    <p className="text-xs text-emerald-700">{formatRp(i.price)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQty(i.id, i.qty - 1)} className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm w-5 text-center">{i.qty}</span>
                    <button onClick={() => updateQty(i.id, i.qty + 1)} className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          {cart.length > 0 && (
            <div className="p-4 border-t space-y-3">
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span className="text-emerald-700">{formatRp(cartTotal)}</span>
              </div>
              <Button onClick={orderViaWA} className="w-full bg-emerald-600 hover:bg-emerald-500 gap-2">
                <MessageCircle className="w-4 h-4" /> Pesan via WhatsApp
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Floating WA for empty cart help */}
      <a
        href={"https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent("Halo Jamu Kito, saya ingin bertanya tentang katalog produk.")}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-5 right-5 z-30 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full p-3.5 shadow-lg"
      >
        <MessageCircle className="w-5 h-5" />
      </a>
    </div>
  );
}
