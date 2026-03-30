import React, { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createPageUrl } from '@/utils';
import { initialProducts } from '../data/initialProducts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Leaf, Phone, Clock, MapPin, Star, CheckCircle, ArrowRight,
    Package, Coffee, Droplet, Heart, Users, Award, Shield,
    Menu, X, ChevronRight, MessageSquare, Mail, Sparkles,
    BarChart2, ShoppingCart, Loader2, LayoutDashboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import heroPremium from '../assets/hero-premium.png';

const ProductDetailModal = lazy(() => import('../components/shop/ProductDetailModal'));

export default function HomePage() {
    const [user, setUser] = useState(null);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeService, setActiveService] = useState('spa');
    const [defaultCompany, setDefaultCompany] = useState(null);
    const [liveProducts, setLiveProducts] = useState(initialProducts);
    const [isLoadingProducts, setIsLoadingProducts] = useState(true);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showProductDetail, setShowProductDetail] = useState(false);
    const [cartItemCount, setCartItemCount] = useState(0);
    const heroRef = useRef(null);

    useEffect(() => {
        console.log('');
        console.log('════════════════════════════════════════════════════');
        console.log('🚀 HOME PAGE MOUNTED');
        console.log('════════════════════════════════════════════════════');

        checkAuth();
        loadDefaultCompanyAndProducts();

        // ✅ AUTO-REFRESH products every 10 seconds
        const refreshInterval = setInterval(() => {
            if (defaultCompany?.id) {
                console.log('🔄 HOME auto-refresh (10s)');
                loadProducts(defaultCompany.id);
            }
        }, 10000);

        return () => {
            console.log('🛑 HOME unmounted');
            clearInterval(refreshInterval);
        };
    }, [defaultCompany?.id]);

    // ✅ REALTIME SYNC - Multi-channel for products
    useEffect(() => {
        if (!defaultCompany?.id) return;

        console.log('📡 HOME: REALTIME sync active for products');

        const productsChannel = new BroadcastChannel('snishop_products_updates');
        const posChannel = new BroadcastChannel('pos_inventory_sync');
        const invChannel = new BroadcastChannel('snishop_inventory_updates');

        productsChannel.onmessage = (e) => {
            if (e.data.companyId === defaultCompany.id) {
                console.log('📡 HOME: Products updated');
                setTimeout(() => loadProducts(defaultCompany.id), 500);
            }
        };

        posChannel.onmessage = (e) => {
            if (e.data.companyId === defaultCompany.id) {
                console.log('📡 HOME: POS updated');
                setTimeout(() => loadProducts(defaultCompany.id), 500);
            }
        };

        invChannel.onmessage = (e) => {
            if (e.data.companyId === defaultCompany.id) {
                console.log('📡 HOME: Inventory updated');
                setTimeout(() => loadProducts(defaultCompany.id), 500);
            }
        };

        const handleUpdate = (event) => {
            const { entityName, companyId } = event.detail || {};
            if (companyId === defaultCompany.id && entityName === 'CompanyPOSProduct') {
                console.log('📡 HOME: Window event - refreshing');
                setTimeout(() => loadProducts(defaultCompany.id), 500);
            }
        };

        window.addEventListener('dataInvalidated', handleUpdate);
        window.addEventListener('productUpdated', handleUpdate);
        window.addEventListener('inventoryUpdated', handleUpdate);

        return () => {
            productsChannel.close();
            posChannel.close();
            invChannel.close();
            window.removeEventListener('dataInvalidated', handleUpdate);
            window.removeEventListener('productUpdated', handleUpdate);
            window.removeEventListener('inventoryUpdated', handleUpdate);
        };
    }, [defaultCompany?.id]);

    const loadDefaultCompanyAndProducts = async () => {
        try {
            setIsLoadingProducts(true);

            console.log('');
            console.log('═══════════════════════════════════════════');
            console.log('🔍 LOADING JAMU KITO INTERNATIONAL DATA');
            console.log('═══════════════════════════════════════════');

            let targetCompany = null;
            const configCompanyId = appParams.companyId;

            // ✅ METHOD 0: Configured Company ID (High Priority)
            if (configCompanyId) {
                try {
                    console.log('📌 METHOD 0: Using configured company ID:', configCompanyId);
                    const configCompany = await base44.entities.Company.get(configCompanyId);
                    if (configCompany) {
                        targetCompany = configCompany;
                        console.log('✅ METHOD 0: Success:', targetCompany.name);
                    }
                } catch (configError) {
                    console.warn('⚠️ Method 0 failed:', configError.message);
                }
            }

            // ✅ METHOD 1: Try DefaultCompanySettings first
            try {
                const settings = await base44.entities.DefaultCompanySettings.filter({
                    is_active: true
                });

                if (settings && settings.length > 0) {
                    const companyId = settings[0].company_id;
                    console.log('📌 Found settings with company ID:', companyId);

                    const company = await base44.entities.Company.get(companyId);

                    if (company) {
                        targetCompany = company;
                        console.log('✅ METHOD 1: Company via settings:', company.name);
                    }
                }
            } catch (settingsError) {
                console.warn('⚠️ Method 1 failed:', settingsError.message);
            }

            // ✅ METHOD 2: Direct query by exact name
            if (!targetCompany) {
                try {
                    const exactMatch = await base44.entities.Company.filter({
                        name: 'JAMU KITO INTERNATIONAL'
                    });

                    if (exactMatch && exactMatch.length > 0) {
                        targetCompany = exactMatch[0];
                        console.log('✅ METHOD 2: Exact name match:', targetCompany.name);
                    }
                } catch (e) {
                    console.warn('⚠️ Method 2 failed:', e.message);
                }
            }

            // ✅ METHOD 3: Direct ID lookup (ALWAYS WORKS)
            if (!targetCompany) {
                try {
                    console.log('🎯 METHOD 3: Direct ID lookup...');
                    const directCompany = await base44.entities.Company.get('694cc38feacdffcc010f0d60');

                    if (directCompany) {
                        targetCompany = directCompany;
                        console.log('✅ METHOD 3: Direct ID success:', targetCompany.name);
                    }
                } catch (e) {
                    console.warn('⚠️ Method 3 failed:', e.message);
                }
            }

            // ✅ METHOD 4: Fallback - search all companies
            if (!targetCompany) {
                try {
                    const allCompanies = await base44.entities.Company.filter({});
                    console.log('📦 Total companies:', allCompanies?.length || 0);

                    if (allCompanies && allCompanies.length > 0) {
                        targetCompany = allCompanies.find((c) =>
                            c.id === '694cc38feacdffcc010f0d60'
                        );

                        if (!targetCompany) {
                            targetCompany = allCompanies.find((c) =>
                                c.name === 'JAMU KITO INTERNATIONAL'
                            );
                        }

                        if (!targetCompany) {
                            targetCompany = allCompanies.find((c) =>
                                c.name && c.name.toUpperCase().includes('JAMU KITO')
                            );
                        }

                        if (targetCompany) {
                            console.log('✅ METHOD 4: Found via search:', targetCompany.name);
                        }
                    }
                } catch (e) {
                    console.warn('⚠️ Method 4 failed:', e.message);
                }
            }

            if (!targetCompany) {
                console.error('❌ CRITICAL: No company found!');
                setIsLoadingProducts(false);
                return;
            }

            setDefaultCompany(targetCompany);
            console.log('');
            console.log('🎯 FINAL SELECTED COMPANY:');
            console.log('   Name:', targetCompany.name);
            console.log('   ID:', targetCompany.id);
            console.log('');

            await loadProducts(targetCompany.id);

        } catch (e) {
            console.error('❌ CRITICAL ERROR:', e);
            setIsLoadingProducts(false);
        } finally {
            setIsLoadingProducts(false);
        }
    };

    const loadProducts = async (companyId) => {
        try {
            console.log('');
            console.log('📦 HOME - FETCHING PRODUCTS DIRECT FROM DB');
            console.log('🆔 Company ID:', companyId);

            // ✅ DIRECT DATABASE QUERY - NO CACHE
            const productsData = await base44.entities.CompanyPOSProduct.filter({
                company_id: companyId,
                is_active: true
            });

            console.log('');
            console.log('✅ PRODUCTS FETCHED:', (productsData || []).length, 'items');

            // ✅ SMART UPDATE - Only update if new data is valid
            if (productsData && productsData.length > 0) {
                console.log('');
                console.log('📋 PRODUCTS BY CATEGORY:');

                const grouped = {};
                productsData.forEach((p) => {
                    const cat = p.category || 'Uncategorized';
                    if (!grouped[cat]) grouped[cat] = [];
                    grouped[cat].push(p.name);
                });

                Object.entries(grouped).forEach(([cat, prods]) => {
                    console.log(`   ${cat}: ${prods.length} items`);
                });

                setLiveProducts(productsData);

                console.log('');
                console.log('✅ HOME UPDATED:', productsData.length, 'products');
                console.log('═══════════════════════════════════════════');
                console.log('');
            } else if (liveProducts.length === 0) {
                // First load - accept even empty
                setLiveProducts(productsData || []);
            }
            // ✅ If data empty but we have products - KEEP existing products
        } catch (err) {
            console.error('❌ Error loading products:', err.message);
            // ✅ Keep existing products on error
        } finally {
            setIsLoadingProducts(false);
        }
    };

    const checkAuth = async () => {
        try {
            const userData = await base44.auth.me();
            if (userData?.id) {
                setUser(userData);
                loadCartCount(userData.id);
            } else {
                setUser(null);
            }
        } catch (e) {
            setUser(null);
        } finally {
            setIsCheckingAuth(false);
        }
    };

    const loadCartCount = async (userId) => {
        try {
            const cartItems = await base44.entities.ShoppingCart.filter({ user_id: userId });
            const totalItems = (cartItems || []).reduce((sum, item) => sum + (item.quantity || 1), 0);
            setCartItemCount(totalItems);
        } catch (e) {
            setCartItemCount(0);
        }
    };

    useEffect(() => {
        if (!user?.id) return;

        const handleCartUpdate = () => {
            loadCartCount(user.id);
        };

        window.addEventListener('cartUpdated', handleCartUpdate);
        return () => window.removeEventListener('cartUpdated', handleCartUpdate);
    }, [user?.id]);


    // ✅ SERVICES - Ambil SEMUA produk dari database, group by kategori
    const jamuServices = useMemo(() => {
        console.log('');
        console.log('🔍 useMemo JAMU SERVICES - FILTERING');
        console.log('   Total liveProducts:', liveProducts?.length || 0);

        if (!liveProducts || liveProducts.length === 0) {
            console.warn('❌ No products to filter for Jamu');
            return [];
        }

        // ✅ ULTRA FLEXIBLE MATCHING - show ALL categories for debugging
        console.log('📋 All product categories:');
        liveProducts.forEach((p) => {
            console.log(`   - ${p.name}: "${p.category}"`);
        });

        const filtered = liveProducts.filter((p) => {
            const cat = (p.category || '').toLowerCase();
            const name = (p.name || '').toLowerCase();

            // ✅ FLEXIBLE: Match jamu/herbal in category OR name
            const match = cat.includes('herbal') ||
                cat.includes('jamu') ||
                cat.includes('obat') ||
                cat.includes('tradisional') ||
                cat.includes('botanical') ||
                cat.includes('medicine') ||
                name.includes('jamu');

            if (match) {
                console.log('   ✅ MATCHED Jamu:', p.name, '(Cat:', p.category, ')');
            }
            return match;
        });

        console.log('✅ Jamu filtered:', filtered.length, 'products');
        console.log('');
        return filtered.slice(0, 8);
    }, [liveProducts]);

    const spaServices = useMemo(() => {
        console.log('🔍 useMemo SPA SERVICES - FILTERING');
        console.log('   Total liveProducts:', liveProducts?.length || 0);

        if (!liveProducts || liveProducts.length === 0) {
            console.warn('❌ No products for Spa');
            return [];
        }

        const filtered = liveProducts.filter((p) => {
            const cat = (p.category || '').toLowerCase();
            const name = (p.name || '').toLowerCase();

            const match = cat.includes('spa') ||
                cat.includes('layanan') ||
                cat.includes('terapi') ||
                cat.includes('treatment') ||
                cat.includes('massage') ||
                name.includes('spa') ||
                name.includes('pijat') ||
                name.includes('massage');

            if (match) {
                console.log('   ✅ MATCHED Spa:', p.name, '(Cat:', p.category, ')');
            }
            return match;
        });

        console.log('✅ Spa filtered:', filtered.length, 'products');
        return filtered.slice(0, 8);
    }, [liveProducts]);

    const maduMinumanServices = useMemo(() => {
        console.log('🔍 useMemo MADU & MINUMAN - FILTERING');
        console.log('   Total liveProducts:', liveProducts?.length || 0);

        if (!liveProducts || liveProducts.length === 0) {
            console.warn('❌ No products for Madu');
            return [];
        }

        const filtered = liveProducts.filter((p) => {
            const cat = (p.category || '').toLowerCase();
            const name = (p.name || '').toLowerCase();

            const match = cat.includes('madu') ||
                cat.includes('minuman') ||
                cat.includes('sirup') ||
                cat.includes('serbuk') ||
                cat.includes('honey') ||
                cat.includes('drink') ||
                cat.includes('beverage') ||
                name.includes('madu') ||
                name.includes('honey');

            if (match) {
                console.log('   ✅ MATCHED Madu/Minuman:', p.name, '(Cat:', p.category, ')');
            }
            return match;
        });

        console.log('✅ Madu/Minuman filtered:', filtered.length, 'products');
        return filtered.slice(0, 8);
    }, [liveProducts]);

    const services = useMemo(() => {
        console.log('');
        console.log('══════════════════════════════════════════');
        console.log('📊 BUILDING SERVICES FOR DISPLAY');
        console.log('   Jamu products:', jamuServices.length);
        console.log('   Spa products:', spaServices.length);
        console.log('   Madu products:', maduMinumanServices.length);
        console.log('══════════════════════════════════════════');
        console.log('');

        return [
            {
                id: 'jamu',
                title: 'Jamu Herbal Tradisional',
                icon: Leaf,
                color: 'from-green-700 to-emerald-700',
                description: 'Produk jamu berkualitas tinggi dengan sertifikasi BPOM untuk kesehatan alami',
                treatments: jamuServices.map((p) => ({
                    name: p.name,
                    category: p.category,
                    price: p.price,
                    desc: p.description || 'Produk herbal berkualitas',
                    image: p.image_url,
                    duration: p.unit
                }))
            },
            {
                id: 'spa',
                title: 'Layanan Spa & Terapi',
                icon: Droplet,
                color: 'from-teal-600 to-cyan-600',
                description: 'Nikmati berbagai layanan spa profesional dengan terapis berpengalaman',
                treatments: spaServices.map((p) => ({
                    name: p.name,
                    category: p.category,
                    price: p.price,
                    desc: p.description || 'Layanan spa profesional',
                    image: p.image_url,
                    duration: p.unit === 'sesi' ? '60-90 menit' : p.unit
                }))
            },
            {
                id: 'madu',
                title: 'Madu & Minuman Serbuk',
                icon: Coffee,
                color: 'from-amber-600 to-orange-600',
                description: 'Produk madu asli dan minuman serbuk herbal untuk kesehatan harian',
                treatments: maduMinumanServices.map((p) => ({
                    name: p.name,
                    category: p.category,
                    price: p.price,
                    desc: p.description || 'Produk madu dan minuman berkualitas',
                    image: p.image_url,
                    duration: p.unit
                }))
            }];

    }, [jamuServices, spaServices, maduMinumanServices]);

    const handleProductClick = (product) => {
        // Redirection to the live production site as requested by user
        console.log('🔗 Redirecting to live production services page for:', product.name);
        window.open('https://jamukitointernasional.base44.app/#services', '_blank');
    };

    const handleAddToCart = async (product) => {
        if (!user?.id) {
            toast.error('Silakan login terlebih dahulu');
            window.location.href = createPageUrl('Login');
            return;
        }

        try {
            // Check if already in cart
            const existing = await base44.entities.ShoppingCart.filter({
                user_id: user.id,
                product_id: product.id
            });

            if (existing && existing.length > 0) {
                // Update quantity
                await base44.entities.ShoppingCart.update(existing[0].id, {
                    quantity: existing[0].quantity + 1
                });
                toast.success('Jumlah di keranjang ditambah');
            } else {
                // Add new item
                await base44.entities.ShoppingCart.create({
                    user_id: user.id,
                    company_id: product.company_id,
                    product_id: product.id,
                    product_name: product.name,
                    product_image: product.image_url,
                    price: product.price,
                    quantity: 1
                });
                toast.success('Ditambahkan ke keranjang');
            }

            // Notify cart icon
            window.dispatchEvent(new Event('cartUpdated'));
        } catch (error) {
            console.error('Error adding to cart:', error);
            toast.error('Gagal menambahkan ke keranjang');
        }
    };

    const handleGetStarted = () => {
        if (user?.id) {
            window.location.href = createPageUrl('Dashboard');
        } else {
            window.location.href = createPageUrl('Login');
        }
    };


    const whyChooseUs = [
        {
            icon: Award,
            title: 'Tersertifikasi',
            desc: 'BPOM, CPOTB, CPPOB'
        },
        {
            icon: CheckCircle,
            title: '100% Alami',
            desc: 'Bahan pilihan berkualitas tinggi'
        },
        {
            icon: Shield,
            title: 'Terpercaya',
            desc: 'Sejak 2018'
        },
        {
            icon: Heart,
            title: 'Harga Terjangkau',
            desc: 'Kualitas premium, harga bersahabat'
        }];


    const testimonials = [
        {
            name: 'Ibu Siti Rahayu',
            role: 'Pelanggan Setia',
            content: 'Jamu Kito membantu saya mengatasi masalah kesehatan dengan cara alami. Produknya berkualitas dan terpercaya!',
            rating: 5,
            location: 'Bengkulu'
        },
        {
            name: 'Pak Bambang',
            role: 'Mitra Bisnis',
            content: 'Layanan spa-nya sangat profesional, terapis ramah dan hasilnya memuaskan. Recommended!',
            rating: 5,
            location: 'Jakarta'
        },
        {
            name: 'Dr. Maya Kusuma',
            role: 'Praktisi Kesehatan',
            content: 'Produk herbal Jamu Kito memenuhi standar kesehatan dan sangat membantu pasien saya',
            rating: 5,
            location: 'Bandung'
        }];


    if (isCheckingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Memuat...</p>
                </div>
            </div>);

    }

    return (
        <div className="min-h-screen bg-white" style={{ scrollBehavior: 'smooth', overscrollBehavior: 'contain' }}>
            {/* Floating WhatsApp Button */}
            <motion.a
                href="https://wa.me/6285279207959?text=Halo%20JAMU%20KITO,%20saya%20ingin%20bertanya"
                target="_blank"
                rel="noopener noreferrer"
                className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-green-600 hover:bg-green-700 rounded-full flex items-center justify-center shadow-2xl"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                animate={{
                    y: [0, -8, 0],
                    boxShadow: [
                        '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                        '0 25px 30px -5px rgba(34, 197, 94, 0.4)',
                        '0 20px 25px -5px rgba(0, 0, 0, 0.1)']

                }}
                transition={{ duration: 2, repeat: Infinity }}>

                <MessageSquare className="w-7 h-7 text-white" />
            </motion.a>

            {/* Premium Floating Header */}
            <header className="fixed top-0 left-0 right-0 z-[90] transition-all duration-500 ease-in-out">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <nav className="flex items-center justify-between px-6 py-3 rounded-full bg-black/10 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.1)] transition-all hover:bg-black/15">
                        {/* Logo */}
                        <div 
                            className="flex items-center gap-3 cursor-pointer group" 
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        >
                            <img
                                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6937a573d12f0f67c2233fb6/d0e698b3e_logo_jamu_kito-removebg-preview1.png"
                                alt="JAMU KITO"
                                className="h-10 md:h-12 object-contain filter drop-shadow-md transition-transform group-hover:scale-105" 
                            />
                        </div>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center gap-8">
                            {['Tentang Kami', 'Layanan', 'Produk', 'Testimoni', 'Kontak'].map((item) => (
                                <a 
                                    key={item}
                                    href={`#${item.toLowerCase().replace(' ', '-')}`} 
                                    className="text-white/80 hover:text-white transition-colors font-medium text-sm tracking-wide lowercase first-letter:uppercase"
                                >
                                    {item}
                                </a>
                            ))}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            {user?.id && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="relative text-white/80 hover:text-white hover:bg-white/10 rounded-full"
                                    onClick={() => window.location.href = createPageUrl('Cart')}
                                >
                                    <ShoppingCart className="w-5 h-5" />
                                    {cartItemCount > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-amber-500 text-black text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full border-2 border-green-950">
                                            {cartItemCount}
                                        </span>
                                    )}
                                </Button>
                            )}

                            {user?.id ? (
                                <Button
                                    onClick={handleGetStarted}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-full px-5 py-2 text-xs font-semibold tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-900/20"
                                >
                                    <LayoutDashboard className="w-4 h-4" />
                                    <span className="hidden sm:inline uppercase">Dashboard</span>
                                </Button>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Button 
                                        variant="ghost" 
                                        onClick={handleGetStarted} 
                                        className="text-white/80 hover:text-white hover:bg-white/10 rounded-full px-5 text-xs font-semibold uppercase tracking-wider hidden sm:flex"
                                    >
                                        Masuk
                                    </Button>
                                    <Button 
                                        onClick={handleGetStarted} 
                                        className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black rounded-full px-6 py-2 text-xs font-bold uppercase tracking-wider shadow-lg shadow-amber-900/20"
                                    >
                                        Mulai
                                    </Button>
                                </div>
                            )}

                            {/* Mobile Menu Toggle */}
                            <Button
                                variant="ghost"
                                size="icon" 
                                className="text-white/80 hover:text-white hover:bg-white/10 md:hidden rounded-full"
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            >
                                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                            </Button>
                        </div>
                    </nav>

                    {/* Mobile Navigation Dropdown */}
                    <AnimatePresence>
                        {mobileMenuOpen && (
                            <motion.div
                                initial={{ height: 0, opacity: 0, scale: 0.95 }}
                                animate={{ height: 'auto', opacity: 1, scale: 1 }}
                                exit={{ height: 0, opacity: 0, scale: 0.95 }}
                                className="md:hidden mt-4 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
                            >
                                <div className="p-4 flex flex-col gap-2">
                                    {['Tentang Kami', 'Layanan', 'Produk', 'Testimoni', 'Kontak'].map((item) => (
                                        <a 
                                            key={item}
                                            href={`#${item.toLowerCase().replace(' ', '-')}`} 
                                            className="block px-4 py-3 rounded-xl hover:bg-white/10 text-white/80 hover:text-white text-sm font-medium transition-all"
                                            onClick={() => setMobileMenuOpen(false)}
                                        >
                                            {item}
                                        </a>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </header>

            {/* Cinematic Hero Section */}
            <section
                ref={heroRef}
                className="relative min-h-[90vh] md:min-h-screen flex items-center justify-center overflow-hidden bg-[#022c22]"
            >
                {/* Dynamic Background */}
                <div className="absolute inset-0 z-0">
                    <motion.div
                        className="absolute inset-0 opacity-40 bg-cover bg-center"
                        style={{
                            backgroundImage: 'url(https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?q=80&w=1974&auto=format&fit=crop)',
                            scale: 1.1
                        }}
                        animate={{
                            scale: [1, 1.05, 1],
                        }}
                        transition={{
                            duration: 20,
                            repeat: Infinity,
                            ease: "linear"
                        }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-[#022c22] via-[#022c22]/90 to-emerald-950/80" />
                    
                    {/* Animated Mesh Gradients */}
                    <div className="absolute top-1/4 -left-1/4 w-[60%] h-[60%] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" />
                    <div className="absolute bottom-1/4 -right-1/4 w-[60%] h-[60%] bg-amber-500/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
                </div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10 w-full pt-20">
                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
                        
                        {/* Text Content */}
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="text-left"
                        >
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-8"
                            >
                                <Sparkles className="w-4 h-4 text-amber-400" />
                                <span className="text-emerald-400 text-xs font-bold uppercase tracking-[0.2em]">Pioneer Wellness Sejak 2018</span>
                            </motion.div>

                            <motion.h1 
                                className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-[0.9] mb-6 tracking-tighter"
                                style={{ fontFamily: 'Outfit, sans-serif' }}
                            >
                                MODERN <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200">HERBAL</span> <br />
                                LIFESTYLE.
                            </motion.h1>

                            <motion.p 
                                className="text-lg md:text-xl text-white/60 mb-10 max-w-lg leading-relaxed font-light"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.6 }}
                            >
                                Memadukan kearifan lokal jamu tradisional dengan standar internasional untuk solusi kesehatan modern yang elegan dan terpercaya.
                            </motion.p>

                            <motion.div 
                                className="flex flex-wrap gap-4"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.8 }}
                            >
                                <Button 
                                    size="lg"
                                    onClick={handleGetStarted}
                                    className="bg-amber-500 hover:bg-amber-400 text-black px-10 py-8 text-lg font-bold rounded-2xl shadow-[0_20px_50px_rgba(217,119,6,0.3)] transition-all hover:-translate-y-1"
                                >
                                    Eksplorasi Sekarang
                                    <ArrowRight className="ml-2 w-6 h-6" />
                                </Button>
                                
                                <Button 
                                    variant="outline"
                                    size="lg"
                                    className="bg-white/5 border-white/10 text-white px-10 py-8 text-lg font-bold rounded-2xl backdrop-blur-xl hover:bg-white/10 transition-all"
                                    onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
                                >
                                    Lihat Layanan
                                </Button>
                            </motion.div>

                            {/* Trust Badges */}
                            <motion.div 
                                className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 pt-10 border-t border-white/5"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 1 }}
                            >
                                {[
                                    { label: 'Sertifikasi', val: 'BPOM RI', icon: Shield },
                                    { label: 'Kualitas', val: 'Premium', icon: Award },
                                    { label: 'Bahan', val: '100% Alami', icon: Leaf },
                                    { label: 'Layanan', val: 'Terpercaya', icon: Heart }
                                ].map((badge, i) => (
                                    <div key={i} className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2 text-amber-500/50">
                                            <badge.icon className="w-3 h-3" />
                                            <span className="text-[10px] uppercase tracking-widest font-bold opacity-60">{badge.label}</span>
                                        </div>
                                        <span className="text-white font-medium text-sm">{badge.val}</span>
                                    </div>
                                ))}
                            </motion.div>
                        </motion.div>

                        {/* Hero Image / Visual */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, rotateY: 20 }}
                            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                            transition={{ duration: 1.2, ease: "easeOut" }}
                            className="relative perspective-1000 hidden lg:block"
                        >
                            <div className="relative group">
                                {/* Glow Effect */}
                                <div className="absolute inset-0 bg-emerald-500/20 rounded-[4rem] blur-[100px] animate-pulse" />
                                
                                <motion.div
                                    animate={{ y: [0, -20, 0] }}
                                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                                    className="relative z-10"
                                >
                                    <img 
                                        src={heroPremium} 
                                        alt="Jamu Kito Premium" 
                                        className="w-full max-w-xl mx-auto drop-shadow-[0_50px_50px_rgba(0,0,0,0.5)] transform transition-transform group-hover:scale-105 duration-700" 
                                    />
                                    
                                    {/* Floating Stats Card */}
                                    <motion.div 
                                        className="absolute -bottom-10 -left-10 bg-white/5 backdrop-blur-3xl border border-white/10 p-6 rounded-3xl shadow-2xl flex items-center gap-4"
                                        initial={{ opacity: 0, y: 40 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 1.5 }}
                                    >
                                        <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center">
                                            <Star className="text-black w-6 h-6 fill-black" />
                                        </div>
                                        <div>
                                            <p className="text-white text-2xl font-bold leading-none">4.9/5</p>
                                            <p className="text-white/40 text-xs uppercase tracking-widest mt-1">Customer Rating</p>
                                        </div>
                                    </motion.div>

                                    {/* Floating Experience Card */}
                                    <motion.div 
                                        className="absolute top-10 -right-5 bg-emerald-600 border border-emerald-400/30 p-6 rounded-3xl shadow-2xl"
                                        initial={{ opacity: 0, x: 40 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 1.8 }}
                                    >
                                        <p className="text-white text-3xl font-black leading-none">7+</p>
                                        <p className="text-white/80 text-xs uppercase tracking-widest mt-1">Years Excellence</p>
                                    </motion.div>
                                </motion.div>
                            </div>
                        </motion.div>

                    </div>
                </div>

                {/* Scroll Indicator */}
                <motion.div 
                    className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2 }}
                >
                    <span className="text-white/20 text-[10px] uppercase tracking-[0.4em] rotate-90 mb-4 h-20 flex items-center">EXPLORE</span>
                    <div className="w-[1px] h-20 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
                </motion.div>
            </section>


            {/* About Section - THE ESSENCE */}
            <section id="about" className="py-32 bg-white relative overflow-hidden">
                {/* Subtle Background Elements */}
                <div className="absolute top-0 right-0 w-1/3 h-full bg-emerald-50/50 -skew-x-12 translate-x-1/2" />
                
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="grid lg:grid-cols-2 gap-20 items-center">
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-[1px] bg-amber-500/50" />
                                <span className="text-amber-600 font-display font-bold text-sm uppercase tracking-[0.3em]">
                                    Warisan Nusantara
                                </span>
                            </div>

                            <h2 className="text-4xl md:text-6xl font-display font-black text-gray-900 mb-8 leading-tight tracking-tighter">
                                Modernisasi <span className="text-emerald-700 italic">Tradisi</span><br />
                                Untuk Masa Depan.
                            </h2>

                            <p className="text-gray-600 mb-8 text-xl leading-relaxed font-light">
                                PT Jamu Kito Internasional lahir dari keinginan luhur untuk membawa kearifan lokal jamu Indonesia ke tingkat dunia, menyelaraskan tradisi dengan inovasi modern.
                            </p>

                            <div className="grid sm:grid-cols-2 gap-8 mb-12">
                                <motion.div 
                                    className="p-8 rounded-[2rem] bg-emerald-50 border border-emerald-100 hover:shadow-xl transition-all duration-500 group"
                                    whileHover={{ y: -5 }}
                                >
                                    <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                        <Eye className="text-white w-6 h-6" />
                                    </div>
                                    <h4 className="font-display font-black text-emerald-900 text-xl mb-3 tracking-tight">VISI KAMI</h4>
                                    <p className="text-emerald-800/70 text-sm leading-relaxed">
                                        Menjadi duta global kesehatan herbal Indonesia yang berkelanjutan dan terpercaya.
                                    </p>
                                </motion.div>

                                <motion.div 
                                    className="p-8 rounded-[2rem] bg-amber-50 border border-amber-100 hover:shadow-xl transition-all duration-500 group"
                                    whileHover={{ y: -5 }}
                                >
                                    <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                        <Target className="text-white w-6 h-6" />
                                    </div>
                                    <h4 className="font-display font-black text-amber-900 text-xl mb-3 tracking-tight">MISI KAMI</h4>
                                    <p className="text-amber-800/70 text-sm leading-relaxed">
                                        Melestarikan tradisi sembari memberdayakan petani lokal melalui proses modern yang akurat.
                                    </p>
                                </motion.div>
                            </div>

                            <Button
                                size="lg"
                                className="bg-emerald-900 hover:bg-emerald-950 text-white rounded-full px-10 py-7 text-lg font-bold shadow-2xl shadow-emerald-900/20 group"
                                onClick={handleGetStarted}
                            >
                                Selengkapnya
                                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, x: 50 }}
                            whileInView={{ opacity: 1, scale: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="relative group"
                        >
                            <div className="absolute -inset-10 bg-emerald-100/50 rounded-[4rem] blur-3xl group-hover:bg-amber-100/30 transition-colors duration-1000" />
                            
                            <div className="relative overflow-hidden rounded-[3rem] shadow-2xl border-4 border-white">
                                <motion.img
                                    src="https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=1200&q=80"
                                    alt="Jamu Traditional"
                                    className="w-full h-full object-cover aspect-[4/5] scale-110 group-hover:scale-100 transition-transform duration-1000"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/40 to-transparent" />
                            </div>

                            {/* Experience Badge - Glassmorphism */}
                            <motion.div
                                className="absolute -bottom-10 -left-10 bg-white/80 backdrop-blur-2xl p-8 rounded-[2.5rem] shadow-2xl border border-white flex flex-col items-center justify-center"
                                initial={{ opacity: 0, scale: 0.8 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.5 }}
                                whileHover={{ scale: 1.05, rotate: -2 }}
                            >
                                <span className="text-5xl font-display font-black text-emerald-900 leading-none">2018</span>
                                <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-amber-600 mt-2">ESTABLISHED</span>
                                <div className="mt-4 flex gap-1">
                                    {[1, 2, 3, 4, 1].map((_, i) => (
                                        <div key={i} className="w-1 h-3 bg-emerald-600/30 rounded-full" />
                                    ))}
                                </div>
                            </motion.div>

                            {/* Accent Decoration */}
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl" />
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Services Section - Modernized */}
            <section id="services" className="py-24 relative overflow-hidden bg-white">
                {/* Background Decoration */}
                <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-emerald-50/50 to-transparent pointer-events-none" />
                <div className="absolute -right-24 top-48 w-96 h-96 bg-amber-200/20 rounded-full blur-3xl pointer-events-none" />
                
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <motion.div
                        className="text-center mb-16"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}>

                        <Badge className="mb-6 px-4 py-1.5 bg-emerald-100 text-emerald-800 border-emerald-200/50 font-medium tracking-wide">
                            Layanan Eksklusif
                        </Badge>
                        <h2 className="text-4xl md:text-6xl font-display font-black text-emerald-950 mb-6 tracking-tight leading-[1.1]">
                            Kesehatan & <span className="text-amber-600">Kesejahteraan</span>
                        </h2>
                        <p className="text-lg md:text-xl text-emerald-900/60 max-w-2xl mx-auto leading-relaxed">
                            Pilihan layanan kesehatan tradisional yang dipadukan dengan teknik modern untuk hasil maksimal bagi tubuh Anda.
                        </p>
                    </motion.div>

                    {/* Premium Category Tabs - Pill Style */}
                    <div className="flex justify-center mb-20">
                        <div className="inline-flex p-1.5 bg-white shadow-2xl shadow-emerald-900/5 rounded-full border border-emerald-100/50 backdrop-blur-xl">
                            {services.map((service) => (
                                <button
                                    key={service.id}
                                    onClick={() => setActiveService(service.id)}
                                    className={`relative px-6 py-3 rounded-full text-sm font-bold transition-all duration-500 overflow-hidden ${
                                        activeService === service.id 
                                        ? 'text-white' 
                                        : 'text-emerald-900/60 hover:text-emerald-900'
                                    }`}
                                >
                                    {activeService === service.id && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute inset-0 bg-emerald-900"
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                    <span className="relative z-10 flex items-center gap-2">
                                        <service.icon className={`w-4 h-4 ${activeService === service.id ? 'opacity-100' : 'opacity-60'}`} />
                                        {service.title}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Category Content */}
                    <AnimatePresence mode="wait">
                        {services.filter((s) => s.id === activeService).map((service) => (
                            <motion.div
                                key={service.id}
                                initial={{ opacity: 0, scale: 0.98, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 1.02, y: -20 }}
                                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>

                                {/* Header Card for Service */}
                                <div className="mb-24 text-center max-w-3xl mx-auto">
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.2 }}
                                        className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-emerald-900 text-white shadow-2xl mb-8 -rotate-3 hover:rotate-0 transition-transform duration-500"
                                    >
                                        <service.icon className="w-10 h-10" />
                                    </motion.div>
                                    <h3 className="text-3xl md:text-4xl font-display font-bold text-emerald-950 mb-4">{service.title}</h3>
                                    <p className="text-emerald-900/60 text-lg leading-relaxed">{service.description}</p>
                                </div>

                                {/* Treatments List */}
                                {isLoadingProducts ? (
                                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                                        <div className="relative w-16 h-16">
                                            <div className="absolute inset-0 border-4 border-emerald-100 rounded-full" />
                                            <div className="absolute inset-0 border-4 border-emerald-900 rounded-full border-t-transparent animate-spin" />
                                        </div>
                                        <p className="text-emerald-900/40 font-medium animate-pulse">Menghadirkan kesegaran...</p>
                                    </div>
                                ) : service.treatments.length === 0 ? (
                                    <div className="text-center py-32 bg-emerald-50/30 rounded-[3rem] border border-dashed border-emerald-200">
                                        <Package className="w-16 h-16 text-emerald-200 mx-auto mb-6 opacity-50" />
                                        <p className="text-emerald-900/60 font-medium italic">Layanan sedang dipersiapkan untuk Anda</p>
                                    </div>
                                ) : (
                                    <div className="space-y-32">
                                        {service.treatments.map((treatment, idx) => (
                                            <motion.div
                                                key={idx}
                                                initial={{ opacity: 0, y: 100 }}
                                                whileInView={{ opacity: 1, y: 0 }}
                                                viewport={{ once: true, margin: "-100px" }}
                                                transition={{ duration: 0.8, delay: idx * 0.1 }}
                                                className={`grid lg:grid-cols-2 gap-16 lg:gap-24 items-center ${idx % 2 === 0 ? '' : 'lg:grid-flow-dense'}`}
                                            >
                                                {/* Image Container - High End */}
                                                <div className={`relative group ${idx % 2 === 0 ? '' : 'lg:col-start-2'}`}>
                                                    <motion.div
                                                        className="relative z-10 overflow-hidden rounded-[3rem] shadow-2xl shadow-emerald-900/20 cursor-pointer aspect-square sm:aspect-[4/3] lg:aspect-square"
                                                        whileHover={{ scale: 0.98 }}
                                                        transition={{ duration: 0.6 }}
                                                        onClick={() => handleProductClick(treatment)}
                                                    >
                                                        {treatment.image ? (
                                                            <motion.img
                                                                src={treatment.image}
                                                                alt={treatment.name}
                                                                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full bg-emerald-50 flex items-center justify-center">
                                                                <Package className="w-20 h-20 text-emerald-200" />
                                                            </div>
                                                        )}
                                                        {/* Glossy Overlay */}
                                                        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-900/40 via-transparent to-white/10 opacity-60 pointer-events-none" />
                                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                                            <div className="bg-white/90 backdrop-blur-md px-6 py-2.5 rounded-full text-emerald-900 font-bold shadow-xl translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                                                                Lihat Detail
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                    {/* Decorative Elements */}
                                                    <div className={`absolute -inset-4 border border-emerald-100 rounded-[3.5rem] -z-10 transition-transform duration-700 group-hover:scale-105 pointer-events-none ${idx % 2 === 0 ? 'bg-amber-50/50' : 'bg-emerald-50/50'}`} />
                                                    <div className={`absolute -bottom-6 ${idx % 2 === 0 ? '-right-6' : '-left-6'} w-24 h-24 bg-gradient-to-br from-amber-200 to-amber-500 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-700 -z-20`} />
                                                </div>

                                                {/* Content - Sophisticated Typography */}
                                                <div className={`${idx % 2 === 0 ? 'lg:pl-12' : 'lg:pr-12 lg:col-start-1'}`}>
                                                    <motion.div
                                                        initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
                                                        whileInView={{ opacity: 1, x: 0 }}
                                                        transition={{ duration: 0.8, delay: 0.2 }}
                                                    >
                                                        {treatment.category && (
                                                            <span className="text-amber-600 font-bold tracking-[0.2em] text-xs uppercase mb-4 block">
                                                                {treatment.category}
                                                            </span>
                                                        )}
                                                        <h3 
                                                            className="text-4xl md:text-5xl font-display font-black text-emerald-950 mb-6 leading-tight cursor-pointer hover:text-emerald-700 transition-colors duration-300"
                                                            onClick={() => handleProductClick(treatment)}
                                                        >
                                                            {treatment.name}
                                                        </h3>
                                                        <p className="text-lg text-emerald-900/60 mb-8 leading-relaxed font-medium">
                                                            {treatment.desc}
                                                        </p>
                                                        
                                                        <div className="flex flex-wrap gap-6 items-center mb-10">
                                                            {treatment.duration && (
                                                                <div className="flex items-center gap-3 bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100/50">
                                                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                                                                        <Clock className="w-4 h-4 text-emerald-800" />
                                                                    </div>
                                                                    <span className="text-sm font-bold text-emerald-900/70">{treatment.duration}</span>
                                                                </div>
                                                            )}
                                                            <div className="text-3xl font-black text-emerald-950">
                                                                <span className="text-amber-600 text-sm align-top mr-1 font-bold">RP</span>
                                                                {treatment.price.toLocaleString('id-ID')}
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-col sm:flex-row gap-4">
                                                            <motion.button
                                                                whileHover={{ scale: 1.02, y: -2 }}
                                                                whileTap={{ scale: 0.98 }}
                                                                className="relative group overflow-hidden bg-emerald-900 text-white px-10 py-5 rounded-2xl font-bold text-lg shadow-2xl shadow-emerald-950/20"
                                                                onClick={() => handleProductClick(treatment)}
                                                            >
                                                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-800 to-emerald-900 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                                                <span className="relative z-10 flex items-center justify-center gap-3">
                                                                    <MessageSquare className="w-5 h-5" />
                                                                    Reservasi Sekarang
                                                                </span>
                                                            </motion.button>
                                                            
                                                            <motion.button
                                                                whileHover={{ scale: 1.02, backgroundColor: 'rgba(5, 46, 22, 0.05)' }}
                                                                whileTap={{ scale: 0.98 }}
                                                                className="px-10 py-5 rounded-2xl border-2 border-emerald-900/10 text-emerald-900 font-bold text-lg transition-colors"
                                                                onClick={() => handleProductClick(treatment)}
                                                            >
                                                                Detail Layanan
                                                            </motion.button>
                                                        </div>
                                                    </motion.div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </section>

            {/* Products Showcase - Cinematic Grid */}
            <section id="produk" className="py-24 bg-[#0a0a0a] relative overflow-hidden">
                {/* Background Text Overlay */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none opacity-[0.02] overflow-hidden w-full text-center">
                    <span className="text-[20vw] font-black text-white leading-none tracking-tighter uppercase">COLLECTIONS</span>
                </div>
                
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <motion.div
                        className="text-center mb-20"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}>

                        <Badge className="mb-6 px-4 py-1.5 bg-amber-500/10 text-amber-500 border-amber-500/20 font-bold tracking-[0.2em] uppercase text-[10px]">
                            Premium Selection
                        </Badge>
                        <h2 className="text-4xl md:text-6xl font-display font-black text-white mb-6 tracking-tight leading-[1.1]">
                            Koleksi <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500">Terbaik</span> Kami
                        </h2>
                        <p className="text-lg md:text-xl text-white/40 max-w-2xl mx-auto leading-relaxed">
                            Sentuhan keajaiban alam dalam setiap produk, dirancang khusus untuk memenuhi standar gaya hidup modern Anda.
                        </p>
                    </motion.div>

                    {isLoadingProducts ? (
                        <div className="flex flex-col items-center justify-center py-32 space-y-6">
                            <div className="relative w-20 h-20">
                                <motion.div 
                                    className="absolute inset-0 border-t-2 border-amber-500 rounded-full"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                />
                                <div className="absolute inset-2 border-r-2 border-emerald-500/50 rounded-full animate-spin-reverse" />
                            </div>
                            <p className="text-white/30 font-bold uppercase tracking-widest text-sm animate-pulse">Menyiapkan Koleksi...</p>
                        </div>
                    ) : liveProducts.length === 0 ? (
                        <div className="text-center py-32 bg-white/5 backdrop-blur-xl rounded-[3rem] border border-white/10">
                            <Package className="w-20 h-20 text-white/10 mx-auto mb-6" />
                            <p className="text-white/40 text-xl font-medium italic">Koleksi baru segera hadir</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                            {liveProducts.map((product, idx) => (
                                <motion.div
                                    key={product.id}
                                    initial={{ opacity: 0, y: 40 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, margin: "-100px" }}
                                    transition={{ delay: idx % 4 * 0.1, duration: 0.6 }}
                                    className="group relative"
                                >
                                    {/* Product Card Container */}
                                    <div className="relative h-full flex flex-col bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] overflow-hidden transition-all duration-700 hover:border-amber-500/30 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                                        
                                        {/* Image Area */}
                                        <div 
                                            className="relative aspect-square overflow-hidden cursor-pointer bg-black/20"
                                            onClick={() => handleProductClick(product)}
                                        >
                                            <motion.img
                                                src={product.image_url || 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=400'}
                                                alt={product.name}
                                                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                                            />
                                            
                                            {/* Labels overlay */}
                                            <div className="absolute top-5 left-5 right-5 flex justify-between items-start">
                                                <Badge className="bg-black/40 backdrop-blur-md text-amber-200 border-amber-900/40 text-[10px] font-black tracking-widest uppercase">
                                                    {product.category || 'Retail'}
                                                </Badge>
                                                {product.unit && (
                                                    <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10">
                                                        <span className="text-[10px] font-black text-white uppercase">{product.unit}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Quick Buy Overlay (Desktop) */}
                                            <div className="absolute inset-0 bg-emerald-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
                                                <motion.button
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-emerald-950 shadow-2xl"
                                                    onClick={(e) => { e.stopPropagation(); handleProductClick(product); }}
                                                >
                                                    <ArrowRight className="w-8 h-8" />
                                                </motion.button>
                                            </div>
                                        </div>

                                        {/* Content Area */}
                                        <div className="p-8 flex flex-col flex-grow">
                                            <h3 className="text-xl font-bold text-white mb-2 leading-tight group-hover:text-amber-400 transition-colors">
                                                {product.name}
                                            </h3>
                                            
                                            <div className="mt-auto pt-6">
                                                <div className="flex items-center justify-between gap-4 mb-6">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold mb-1">Investasi</span>
                                                        <span className="text-2xl font-black text-white tracking-tighter">
                                                            <span className="text-amber-500 text-sm align-top mr-1">RP</span>
                                                            {product.price.toLocaleString('id-ID')}
                                                        </span>
                                                    </div>
                                                    <motion.button
                                                        whileHover={{ scale: 1.1, rotate: 90 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-black shadow-lg shadow-amber-500/20"
                                                        onClick={(e) => { e.stopPropagation(); handleAddToCart(product); }}
                                                    >
                                                        <ShoppingCart className="w-5 h-5 fill-current" />
                                                    </motion.button>
                                                </div>

                                                <motion.button
                                                    whileHover={{ y: -2 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    className="w-full py-4 px-6 rounded-2xl bg-white/5 border border-white/10 text-white text-sm font-bold uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                                                    onClick={() => handleProductClick(product)}
                                                >
                                                    Selengkapnya
                                                    <ChevronRight className="w-4 h-4 opacity-50" />
                                                </motion.button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Excellence Grid - THE DARK STANDARD */}
            <section className="py-32 bg-[#022c22] relative overflow-hidden">
                {/* Visual Anchors */}
                <div className="absolute top-0 right-0 w-1/2 h-full bg-black/20 -skew-x-12 translate-x-1/2 pointer-events-none" />
                <div className="absolute top-1/4 left-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] animate-pulse" />
                
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="grid lg:grid-cols-2 gap-20 items-center mb-24">
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                        >
                            <span className="text-amber-500 font-black tracking-[0.4em] text-[10px] uppercase mb-6 block">
                                The Singularity Standard
                            </span>
                            <h2 className="text-4xl md:text-7xl font-display font-black text-white mb-8 leading-[0.9] tracking-tighter">
                                MENGAPA<br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500">JAMU KITO?</span>
                            </h2>
                            <p className="text-emerald-100/40 text-xl leading-relaxed max-w-lg mb-10 font-light">
                                Kami menetapkan standar baru dalam kesehatan herbal, menggabungkan kemurnian alam dengan akurasi modern untuk kualitas hidup yang tak tertandingi.
                            </p>
                            
                            <div className="flex gap-10">
                                <div>
                                    <p className="text-4xl font-black text-white mb-1">100%</p>
                                    <p className="text-[10px] text-amber-500 uppercase tracking-widest font-bold">Natural Purity</p>
                                </div>
                                <div className="w-[1px] h-12 bg-white/10" />
                                <div>
                                    <p className="text-4xl font-black text-white mb-1">BPOM</p>
                                    <p className="text-[10px] text-amber-500 uppercase tracking-widest font-bold">Certified Quality</p>
                                </div>
                            </div>
                        </motion.div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {whyChooseUs.map((item, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                    whileInView={{ opacity: 1, scale: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: idx * 0.1, duration: 0.5 }}
                                    className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 backdrop-blur-xl hover:bg-white/10 hover:border-amber-500/30 transition-all duration-500 group"
                                >
                                    <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition-transform shadow-lg shadow-amber-500/20">
                                        <item.icon className="w-7 h-7 text-black" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-3 tracking-tight group-hover:text-amber-400 transition-colors">{item.title}</h3>
                                    <p className="text-white/40 text-sm leading-relaxed">{item.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Infinite Success Ticker */}
                    <motion.div
                        className="py-12 border-y border-white/5 grid grid-cols-2 md:grid-cols-3 gap-12"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.5 }}>
                        
                        {[
                            { icon: Users, value: '1,250+', label: 'Happy Souls' },
                            { icon: Package, value: '150+', label: 'Elite Products' },
                            { icon: Heart, value: '5,000+', label: 'Pure Reviews' }
                        ].map((stat, idx) => (
                            <div key={idx} className="text-center group cursor-default">
                                <stat.icon className="w-6 h-6 text-amber-500/50 mx-auto mb-4 group-hover:text-amber-400 transition-colors" />
                                <p className="text-4xl md:text-6xl font-black text-white mb-2 tracking-tighter group-hover:scale-105 transition-transform duration-500">
                                    {stat.value}
                                </p>
                                <p className="text-[10px] text-white/20 uppercase tracking-[0.4em] font-bold">{stat.label}</p>
                            </div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Testimonials - THE LUXURY REVIEW */}
            <section id="testimoni" className="py-32 bg-white relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-24">
                        <Badge className="mb-6 px-4 py-1.5 bg-emerald-100 text-emerald-800 border-emerald-200/50 font-bold tracking-[0.2em] uppercase text-[10px]">
                            Voice of Excellence
                        </Badge>
                        <h2 className="text-4xl md:text-6xl font-display font-black text-emerald-950 mb-6 tracking-tight">
                            Review <span className="italic text-emerald-800">Eksklusif</span>
                        </h2>
                        <div className="flex items-center justify-center gap-1">
                            {[1, 2, 3, 4, 5].map((_, i) => (
                                <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                            ))}
                            <span className="ml-3 text-emerald-900/40 text-sm font-bold uppercase tracking-widest">5.0 average rating</span>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {testimonials.map((testimonial, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.2, duration: 0.8 }}
                                className="relative p-10 rounded-[3rem] bg-emerald-50/50 border border-emerald-100/50 hover:bg-white hover:shadow-2xl hover:shadow-emerald-900/10 transition-all duration-700 group"
                            >
                                <QuoteIcon className="absolute top-8 right-10 w-16 h-16 text-emerald-900/5 group-hover:text-emerald-900/10 transition-colors" />
                                
                                <div className="relative z-10">
                                    <div className="flex gap-1 mb-8">
                                        {[...Array(testimonial.rating)].map((_, i) => (
                                            <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                                        ))}
                                    </div>
                                    
                                    <p className="text-xl md:text-2xl font-light text-emerald-950 mb-10 leading-relaxed italic">
                                        "{testimonial.content}"
                                    </p>
                                    
                                    <div className="flex items-center gap-5">
                                        <div className="w-14 h-14 rounded-2xl bg-emerald-900 flex items-center justify-center text-white text-xl font-bold shadow-xl shadow-emerald-900/20 group-hover:rotate-6 transition-transform">
                                            {testimonial.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-emerald-950 tracking-tight">{testimonial.name}</p>
                                            <p className="text-[10px] text-emerald-800/40 uppercase tracking-[0.2em] font-black">{testimonial.role}</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA & Contact Section - IMMERSIVE DARK THEME */}
            <section id="kontak" className="relative py-32 bg-[#022c22] overflow-hidden">
                <div className="absolute inset-0 opacity-[0.03]">
                    <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '60px 60px' }} />
                </div>
                
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="grid lg:grid-cols-2 gap-20 items-center">
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            <Badge className="mb-8 px-5 py-2 bg-amber-500 text-black font-black uppercase tracking-[0.2em] text-[10px] rounded-full">
                                Connect With Us
                            </Badge>
                            <h2 className="text-4xl md:text-7xl font-display font-black text-white mb-8 leading-[0.9] tracking-tighter">
                                MULAI HIDUP<br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500">LEBIH SEHAT.</span>
                            </h2>
                            <p className="text-emerald-100/40 text-xl leading-relaxed mb-12 max-w-lg font-light">
                                Hubungi konsultan kesehatan kami sekarang atau kunjungi pusat layanan Jamu Kito terdekat.
                            </p>
                            
                            <div className="space-y-6">
                                {[
                                    { icon: Phone, title: 'Priority Line', val: '081-1717-7959', color: 'bg-emerald-500/10 text-emerald-400' },
                                    { icon: Mail, title: 'Official Email', val: 'jamukito2023@gmail.com', color: 'bg-amber-500/10 text-amber-500' },
                                    { icon: MapPin, title: 'Elite Lounge', val: 'Bengkulu, Indonesia', color: 'bg-emerald-500/10 text-emerald-400' }
                                ].map((item, i) => (
                                    <motion.div 
                                        key={i} 
                                        className="flex items-center gap-6 p-6 rounded-3xl bg-white/5 border border-white/5 backdrop-blur-xl hover:bg-white/10 transition-all cursor-pointer group"
                                        whileHover={{ x: 10 }}
                                    >
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform`}>
                                            <item.icon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase font-black tracking-widest text-white/30 mb-1">{item.title}</p>
                                            <p className="text-lg font-bold text-white tracking-tight">{item.val}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>

                        <div className="relative">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                className="p-10 rounded-[3rem] bg-white/5 border border-white/10 backdrop-blur-3xl shadow-2xl relative z-10"
                            >
                                <h3 className="text-2xl font-bold text-white mb-8 tracking-tight">Luxury Certification</h3>
                                <div className="space-y-8">
                                    {[
                                        { title: 'CPPOB Certified', desc: "Indonesia's Food Production Standard" },
                                        { title: 'CPOTB Approved', desc: "GMP for Traditional Medicine" },
                                        { title: 'BPOM Registered', desc: "Elite Health & Safety Assurance" }
                                    ].map((cert, i) => (
                                        <div key={i} className="flex gap-5">
                                            <div className="w-6 h-6 bg-amber-500 rounded-full flex-shrink-0 flex items-center justify-center">
                                                <CheckCircle className="w-4 h-4 text-black" />
                                            </div>
                                            <div>
                                                <p className="text-white font-bold text-lg leading-none mb-2">{cert.title}</p>
                                                <p className="text-white/40 text-sm leading-relaxed">{cert.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                <Button
                                    size="lg"
                                    className="w-full mt-12 bg-amber-500 hover:bg-amber-400 text-black py-8 rounded-[2rem] text-lg font-black uppercase tracking-widest shadow-2xl shadow-amber-500/20"
                                    onClick={() => window.open('https://wa.me/6285279207959', '_blank')}
                                >
                                    <MessageSquare className="w-6 h-6 mr-3" />
                                    Bicara Sekarang
                                </Button>
                            </motion.div>
                            
                            {/* Visual Decoration */}
                            <div className="absolute -top-10 -right-10 w-64 h-64 bg-emerald-500/20 rounded-full blur-[100px] -z-10" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer - THE OMEGA LAYER */}
            <footer className="bg-[#022c22] text-white py-24 relative border-t border-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-24">
                        <div className="col-span-1 lg:col-span-1">
                            <div className="flex items-center gap-4 mb-8">
                                <img
                                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6937a573d12f0f67c2233fb6/d0e698b3e_logo_jamu_kito-removebg-preview1.png"
                                    alt="JAMU KITO"
                                    className="h-12 w-auto filter drop-shadow-lg" 
                                />
                            </div>
                            <p className="text-white/40 text-sm leading-relaxed mb-8 max-w-xs font-medium">
                                Harmoni tradisi dan inovasi modern untuk masa depan kesehatan yang berkelanjutan. Pioneer wellness nusantara sejak 2018.
                            </p>
                            <div className="flex gap-4">
                                {['instagram', 'facebook', 'twitter'].map((social) => (
                                    <motion.div 
                                        key={social}
                                        whileHover={{ scale: 1.1, y: -2 }}
                                        className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center cursor-pointer hover:bg-amber-500 hover:text-black transition-all"
                                    >
                                        <div className="w-4 h-4 uppercase text-[8px] font-black">{social.charAt(0)}</div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-white font-black uppercase tracking-[0.3em] text-[10px] mb-8">Layanan Premium</h3>
                            <ul className="space-y-4">
                                {[
                                    { name: 'Spa & Terapi Ritual', id: 'spa' },
                                    { name: 'Jamu Herbal Botani', id: 'jamu' },
                                    { name: 'Minuman Sehat Madu', id: 'madu' },
                                    { name: 'Koleksi Retail Elite', id: 'produk' }
                                ].map((link) => (
                                    <li 
                                        key={link.id}
                                        onClick={() => { setActiveService(link.id); document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' }); }}
                                        className="text-white/40 hover:text-white transition-colors cursor-pointer text-sm font-bold flex items-center gap-3 group"
                                    >
                                        <div className="w-1 h-1 bg-amber-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                        {link.name}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-white font-black uppercase tracking-[0.3em] text-[10px] mb-8">Informasi Bisnis</h3>
                            <ul className="space-y-4">
                                {[
                                    { name: 'Tentang Perusahaan', id: 'about' },
                                    { name: 'Visi & Misi Global', id: 'about' },
                                    { name: 'Sertifikasi & Legalitas', id: 'kontak' },
                                    { name: 'Karier & Kemitraan', id: 'kontak' }
                                ].map((link) => (
                                    <li 
                                        key={link.name}
                                        onClick={() => document.getElementById(link.id)?.scrollIntoView({ behavior: 'smooth' })}
                                        className="text-white/40 hover:text-white transition-colors cursor-pointer text-sm font-bold flex items-center gap-3 group"
                                    >
                                        <div className="w-1 h-1 bg-amber-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                        {link.name}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-white font-black uppercase tracking-[0.3em] text-[10px] mb-8">Lounge Lokasi</h3>
                            <div className="p-6 rounded-3xl bg-white/5 border border-white/5 backdrop-blur-xl">
                                <p className="text-sm font-bold text-white mb-2 leading-none">Bengkulu Global Hub</p>
                                <p className="text-xs text-white/30 leading-relaxed mb-6 font-medium italic">
                                    Jl. Jend. Sudirman No. 45<br />
                                    Bengkulu, Indonesia 38114
                                </p>
                                <Button
                                    variant="outline"
                                    className="w-full bg-white/5 border-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10"
                                    onClick={() => window.open('https://maps.google.com', '_blank')}
                                >
                                    Dapatkan Arahan
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
                        <p className="text-[10px] text-white/20 font-bold uppercase tracking-[0.4em]">
                            &copy; 2025 PT JAMUKITO INTERNATIONAL. THE SINGULARITY ARCHITECTED.
                        </p>
                        <div className="flex gap-10">
                            {['Privasi', 'Ketentuan', 'Cookies'].map((link) => (
                                <a key={link} href="#" className="text-[10px] text-white/20 hover:text-amber-500 font-bold uppercase tracking-[0.4em] transition-colors">{link}</a>
                            ))}
                        </div>
                    </div>
                </div>
            </footer>

            {/* Product Detail Modal */}
            <Suspense fallback={null}>
                <ProductDetailModal
                    product={selectedProduct}
                    isOpen={showProductDetail}
                    onClose={() => {
                        setShowProductDetail(false);
                        setSelectedProduct(null);
                    }}
                    currentUser={user}
                    companyData={defaultCompany}
                />
            </Suspense>
        </div>);

}