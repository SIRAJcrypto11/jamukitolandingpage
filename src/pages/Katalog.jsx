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
  Package, ChevronLeft, Smartphone
} from 'lucide-react';

const COMPANY_ID = '694cc38feacdffcc010f0d60';
const WA_NUMBER = '6285279207959';
const BANK_INFO = [
  'BCA 6555000603 a.n. Aulia Wulandari',
  'Mandiri 1790000813571 a.n. Aulia Wulandari',
  'BSI 7213306997 a.n. Aulia Wulandari',
  'BPD 1020201041230 a.n. Aulia Wulandari',
].join('\n');
const CART_KEY = 'jk_katalog_cart';

const formatRp = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

// Priority: herbal / signature products first, beverage/water last
const PRIORITY_KEYWORDS = [
  'herbal', 'jamu', 'madu', 'sr12', 'onkou', 'kunyit', 'kapsul', 'bubuk',
  'beauty', 'spa', 'totok', 'hotstone', 'mbr', 'sabun', 'minyak', 'v-co', 'vco'
];
const DEPRIORITIZE_KEYWORDS = [
  'aqua', 'air mineral', 'cristallin', 'crystalline', 'le minerale', 'cleo',
  'vit', 'minuman', 'snack', 'chitato', 'indomie', 'mie', 'teh botol'
];

function productScore(p) {
  const text = `${p.name || ''} ${p.category || ''}`.toLowerCase();
  let score = 50;
  if (PRIORITY_KEYWORDS.some((k) => text.includes(k))) score += 40;
  if (DEPRIORITIZE_KEYWORDS.some((k) => text.includes(k))) score -= 60;
  // slight boost for products with image
  if (p.image_url) score += 2;
  return score;
}

export default function KatalogPage() {
  const [products, setProducts] = useState(initialProducts);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch { return []; }
  });
  const [showCart, setShowCart] = useState(false);
  const [detail, setDetail] = useState(null);
  const [user, setUser] = useState(null);

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
        // keep static
      }
      try {
        const me = await base44.auth.me();
        if (!cancelled && me?.id) setUser(me);
      } catch {
        // guest
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  const sorted = useMemo(() => {
    return [...products].sort((a, b) => productScore(b) - productScore(a));
  }, [products]);

  const categories = useMemo(() => {
    const set = new Set(sorted.map((p) => p.category).filter(Boolean));
    // put priority categories first
    const list = Array.from(set);
    list.sort((a, b) => {
      const aPri = PRIORITY_KEYWORDS.some((k) => a.toLowerCase().includes(k)) ? 1 : 0;
      const bPri = PRIORITY_KEYWORDS.some((k) => b.toLowerCase().includes(k)) ? 1 : 0;
      return bPri - aPri || a.localeCompare(b);
    });
    return ['all', ...list];
  }, [sorted]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sorted.filter((p) => {
      const okCat = category === 'all' || p.category === category;
      const okQ = !q || (p.name || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
      return okCat && okQ;
    });
  }, [sorted, search, category]);

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

  const orderViaWA = async () => {
    if (cart.length === 0) {
      toast.error('Keranjang masih kosong');
      return;
    }
    const lines = cart.map((i) => '- ' + i.name + ' x' + i.qty + ' = ' + formatRp(i.price * i.qty)).join('\n');
    const msg = 'Halo Jamu Kito International!\n\nSaya ingin memesan dari katalog:\n' + lines + '\n\nTotal: ' + formatRp(cartTotal) + '\n\nTransfer ke:\n' + BANK_INFO + '\n\nMohon konfirmasi. Terima kasih!';
    // If logged in, also create CompanyOrder so admin sees it
    if (user?.id) {
      try {
        await base44.entities.CompanyOrder.create({
          company_id: COMPANY_ID,
          customer_id: user.id,
          customer_email: user.email || '',
          customer_name: user.full_name || user.email || 'Member',
          order_number: 'WA-' + Date.now(),
          items: cart.map((i) => ({ product_id: i.id, product_name: i.name, quantity: i.qty, price: i.price, subtotal: i.price * i.qty })),
          total_amount: cartTotal,
          status: 'pending',
          payment_method: 'transfer',
          notes: 'Order via WhatsApp dari katalog',
          shipping_address: { name: user.full_name || '', phone: '', address: '', city: '', province: '', postal_code: '' },
        });
        toast.success('Pesanan tercatat di sistem');
      } catch {}
    }
    window.open('https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(msg), '_blank');
  };

  const orderViaApp = async () => {
    if (cart.length === 0) {
      toast.error('Keranjang masih kosong');
      return;
    }
    try {
      const me = user || await base44.auth.me();
      if (!me?.id) {
        toast.info('Login sebagai member untuk order via aplikasi');
        base44.auth.redirectToLogin(window.location.href);
        return;
      }
      // Persist cart for the app checkout to pick up
      localStorage.setItem('jk_app_checkout_cart', JSON.stringify(cart));
      toast.success('Membuka checkout aplikasi...');
      window.location.href = '/Checkout';
    } catch {
      toast.info('Silakan login sebagai member terlebih dahulu');
      base44.auth.redirectToLogin(window.location.href);
    }
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-[#f6f5f1] text-[#1a2e1d] overflow-hidden">
      {/* Fixed header — never scrolls away */}
      <header className="shrink-0 z-50 bg-[#0f1f12] border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
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
            className="relative flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold px-3.5 py-2 rounded-full transition"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">Keranjang</span>
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-black text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Compact title strip — stays with header */}
      <section className="shrink-0 bg-[#0f1f12] text-white px-4 pb-2">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-sm font-semibold text-white/80">Katalog Produk</h1>
          <span className="text-[11px] text-amber-300">Herbal di atas</span>
        </div>
      </section>

      {/* Sticky filter strip (sticks under fixed header) */}
      <div className="shrink-0 z-40 bg-[#f6f5f1] border-b border-black/5 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 space-y-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari produk..."
              className="pl-9 bg-white border-black/10 h-10"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                  category === c
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-black/10 hover:border-emerald-400'
                }`}
              >
                {c === 'all' ? 'Semua' : c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <main className="flex-1 overflow-y-auto overscroll-contain">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-3 text-sm text-gray-500">
          <span>{filtered.length} produk</span>
          <span className="text-emerald-700 text-xs font-medium">Herbal & unggulan di atas</span>
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
                <button onClick={() => setDetail(p)} className="aspect-square bg-gray-50 relative">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
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
      </div>
      </main>

      {/* Detail */}
      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          {detail && (
            <div>
              <div className="aspect-square bg-gray-50">
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

      {/* Cart */}
      <Dialog open={showCart} onOpenChange={setShowCart}>
        <DialogContent className="max-w-md p-0">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-bold flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" /> Keranjang ({cartCount})
            </h2>
            <button onClick={() => setShowCart(false)}><X className="w-5 h-5" /></button>
          </div>
          <div className="max-h-72 overflow-auto p-4 space-y-3">
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
                    <button onClick={() => updateQty(i.id, i.qty - 1)} className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm w-5 text-center">{i.qty}</span>
                    <button onClick={() => updateQty(i.id, i.qty + 1)} className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          {cart.length > 0 && (
            <div className="p-4 border-t space-y-2.5">
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span className="text-emerald-700">{formatRp(cartTotal)}</span>
              </div>
              <Button onClick={orderViaWA} className="w-full bg-emerald-600 hover:bg-emerald-500 gap-2 h-11">
                <MessageCircle className="w-4 h-4" /> Pesan via WhatsApp
              </Button>
              <Button onClick={orderViaApp} variant="outline" className="w-full gap-2 h-11 border-emerald-600 text-emerald-700 hover:bg-emerald-50">
                <Smartphone className="w-4 h-4" /> Order via Aplikasi
                <span className="text-[10px] font-normal opacity-70">(login member)</span>
              </Button>
              {!user && (
                <p className="text-[11px] text-center text-gray-400">
                  Order via aplikasi memerlukan login sebagai member.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Floating WA */}
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
