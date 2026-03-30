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
    BarChart2, ShoppingCart, Loader2
} from
    'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

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

            {/* Header */}
            <header className="border-b bg-white/95 backdrop-blur-md sticky top-0 z-40 shadow-sm border-green-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                            <img
                                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6937a573d12f0f67c2233fb6/d0e698b3e_logo_jamu_kito-removebg-preview1.png"
                                alt="JAMU KITO"
                                className="h-12 md:h-14 object-contain" />

                        </div>

                        <nav className="hidden md:flex items-center gap-8">
                            <a href="#about" className="text-gray-700 hover:text-green-800 transition-colors font-medium">Tentang Kami</a>
                            <a href="#services" className="text-gray-700 hover:text-green-800 transition-colors font-medium">Layanan</a>
                            <a href="#products" className="text-gray-700 hover:text-green-800 transition-colors font-medium">Produk</a>
                            <a href="#testimonials" className="text-gray-700 hover:text-green-800 transition-colors font-medium">Testimoni</a>
                            <a href="#contact" className="text-gray-700 hover:text-green-800 transition-colors font-medium">Kontak</a>
                        </nav>

                        <div className="flex items-center gap-3">
                            {user?.id && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="relative"
                                    onClick={() => window.location.href = createPageUrl('Cart')}
                                >
                                    <ShoppingCart className="w-5 h-5 text-green-800" />
                                    {cartItemCount > 0 && (
                                        <Badge className="absolute -top-1 -right-1 bg-red-600 text-white text-xs min-w-[20px] h-5 flex items-center justify-center px-1 rounded-full">
                                            {cartItemCount}
                                        </Badge>
                                    )}
                                </Button>
                            )}

                            {user?.id ?
                                <Button
                                    onClick={handleGetStarted}
                                    className="bg-green-800 hover:bg-green-900 text-white">

                                    <BarChart2 className="w-4 h-4 mr-2" />
                                    Dashboard
                                </Button> :

                                <>
                                    <Button variant="ghost" onClick={handleGetStarted} className="hidden md:flex">
                                        Masuk
                                    </Button>
                                    <Button onClick={handleGetStarted} className="bg-green-800 hover:bg-green-900">
                                        Daftar
                                    </Button>
                                </>
                            }
                            <Button
                                variant="ghost"
                                size="icon" className="bg-green-800 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground h-9 w-9 md:hidden"

                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>

                                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                            </Button>
                        </div>
                    </div>

                    <AnimatePresence>
                        {mobileMenuOpen &&
                            <motion.nav
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="md:hidden pb-4 space-y-2">

                                <a href="#about" className="block px-4 py-2 rounded hover:bg-gray-100 text-gray-700" onClick={() => setMobileMenuOpen(false)}>Tentang Kami</a>
                                <a href="#services" className="block px-4 py-2 rounded hover:bg-gray-100 text-gray-700" onClick={() => setMobileMenuOpen(false)}>Layanan</a>
                                <a href="#products" className="block px-4 py-2 rounded hover:bg-gray-100 text-gray-700" onClick={() => setMobileMenuOpen(false)}>Produk</a>
                                <a href="#testimonials" className="block px-4 py-2 rounded hover:bg-gray-100 text-gray-700" onClick={() => setMobileMenuOpen(false)}>Testimoni</a>
                                <a href="#contact" className="block px-4 py-2 rounded hover:bg-gray-100 text-gray-700" onClick={() => setMobileMenuOpen(false)}>Kontak</a>
                            </motion.nav>
                        }
                    </AnimatePresence>
                </div>
            </header>

            {/* Hero Section */}
            <section
                ref={heroRef}
                className="relative min-h-[600px] md:min-h-[700px] flex items-center justify-center overflow-hidden">

                {/* Background Image with Parallax Effect */}
                <motion.div
                    className="absolute inset-0 z-0"
                    style={{
                        backgroundImage: 'url(https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=1920)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                    }}
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 1.5 }} />


                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-green-800/60 via-emerald-700/70 to-green-900/80 z-10"></div>

                {/* Floating Elements */}
                <motion.div
                    className="absolute top-20 left-10 w-20 h-20 bg-yellow-400/20 rounded-full blur-2xl"
                    animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
                    transition={{ duration: 6, repeat: Infinity }} />

                <motion.div
                    className="absolute bottom-40 right-20 w-32 h-32 bg-amber-400/20 rounded-full blur-3xl"
                    animate={{ y: [0, 20, 0], x: [0, -15, 0] }}
                    transition={{ duration: 8, repeat: Infinity }} />


                <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-20 w-full">
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, ease: "easeOut" }}>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2, duration: 0.6 }}>

                            <Badge className="mb-6 bg-white/20 text-white border-white/30 px-3 sm:px-5 py-2 backdrop-blur-md text-xs sm:text-sm">
                                <Leaf className="w-3 sm:w-4 h-3 sm:h-4 mr-1 sm:mr-2 inline" />
                                <span className="inline-block">Since 2018 - Practical Healthy Living Every Day</span>
                            </Badge>
                        </motion.div>

                        <motion.h1
                            className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight px-2"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4, duration: 0.8 }}>

                            <motion.span
                                className="inline-block"
                                animate={{
                                    textShadow: [
                                        "0 0 20px rgba(255,255,255,0.3)",
                                        "0 0 30px rgba(255,255,255,0.5)",
                                        "0 0 20px rgba(255,255,255,0.3)"]

                                }}
                                transition={{ duration: 3, repeat: Infinity }}>

                                PT JAMUKITO INTERNATIONAL
                            </motion.span>
                            <motion.span
                                className="block text-xl sm:text-2xl md:text-4xl mt-4 text-green-200"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.6 }}>

                                Jamu, Spa & Herbal Wellness
                            </motion.span>
                        </motion.h1>

                        <motion.p
                            className="text-base sm:text-lg md:text-xl text-white/90 mb-4 max-w-3xl mx-auto px-4"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.8 }}>

                            "Your TRULY Solutions for Health & Wellness"
                        </motion.p>

                        <motion.div
                            className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl mx-auto mb-8 px-4 md:px-0"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1 }}>

                            {[
                                { text: '✓ Terapis Ramah & Profesional', icon: Users },
                                { text: '✓ Produk Tersertifikasi BPOM', icon: Shield },
                                { text: '✓ Bahan Alami Berkualitas Tinggi', icon: Leaf },
                                { text: '✓ Gratis Biaya Transportasi', icon: CheckCircle }].
                                map((item, idx) =>
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, x: -30 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 1.2 + idx * 0.1 }}
                                        whileHover={{ scale: 1.05, x: 5 }}
                                        className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-3 rounded-lg w-full">

                                        <item.icon className="w-5 h-5 text-green-200 flex-shrink-0" />
                                        <p className="text-white text-xs sm:text-sm md:text-base font-medium leading-tight">
                                            {item.text}
                                        </p>
                                    </motion.div>
                                )}
                        </motion.div>

                        <motion.div
                            className="flex flex-col sm:flex-row gap-4 justify-center"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1.4 }}>

                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                    size="lg"
                                    className="bg-white text-green-800 hover:bg-gray-100 px-8 py-6 text-lg font-semibold shadow-2xl"
                                    onClick={() => {
                                        const phone = '6285279207959';
                                        const text = 'Halo JAMU KITO, saya ingin memesan';
                                        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
                                    }}>

                                    <MessageSquare className="mr-2 w-5 h-5" />
                                    Pesan Sekarang
                                </Button>
                            </motion.div>
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-green-800 px-8 py-6 text-lg font-semibold"
                                    onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}>

                                    Lihat Layanan
                                    <ArrowRight className="ml-2 w-5 h-5" />
                                </Button>
                            </motion.div>
                        </motion.div>

                        {user &&
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="mt-6">

                                <Button
                                    onClick={handleGetStarted}
                                    className="bg-yellow-700 hover:bg-yellow-800 text-white shadow-lg">

                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Akses Dashboard Management
                                </Button>
                            </motion.div>
                        }
                    </motion.div>
                </div>
            </section>

            {/* About Section */}
            <section id="about" className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: false, margin: "-100px" }}
                            transition={{ duration: 0.6 }}>

                            <Badge className="mb-4 bg-green-100 text-green-900 border border-green-200">
                                Tentang Kami
                            </Badge>
                            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">
                                PT JAMU KITO INTERNATIONAL
                            </h2>
                            <p className="text-gray-600 mb-4 text-lg leading-relaxed">
                                PT. Jamu Kito Internasional is a modern herbal company committed to bringing the wisdom of Indonesian traditional medicine (jamu) into today's lifestyle.
                            </p>
                            <p className="text-gray-600 mb-6 leading-relaxed">
                                From handcrafted jamu recipes to modern herbal drinks, our products are designed for people who seek balance — between tradition and innovation, nature and science.
                            </p>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-green-100 p-4 rounded-lg border border-green-300">
                                    <h4 className="font-bold text-green-900 mb-2">VISION</h4>
                                    <p className="text-sm text-gray-700">
                                        To become a global ambassador of Indonesian herbal wellness
                                    </p>
                                </div>
                                <div className="bg-amber-100 p-4 rounded-lg border border-amber-300">
                                    <h4 className="font-bold text-yellow-900 mb-2">MISSION</h4>
                                    <p className="text-sm text-gray-700">
                                        To preserve and modernize Indonesia's herbal traditions
                                    </p>
                                </div>
                            </div>

                            <Button
                                onClick={handleGetStarted}
                                className="bg-green-800 hover:bg-green-900 text-white">

                                Pelajari Lebih Lanjut
                                <ChevronRight className="ml-2 w-4 h-4" />
                            </Button>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: false, margin: "-100px" }}
                            transition={{ duration: 0.6 }}
                            className="relative">

                            <motion.img
                                src="https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=800"
                                alt="Jamu Traditional"
                                className="rounded-2xl shadow-2xl"
                                whileHover={{ scale: 1.05 }}
                                transition={{ duration: 0.5 }} />

                            <motion.div
                                className="absolute -bottom-6 -left-6 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl"
                                initial={{ opacity: 0, scale: 0.5 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: false }}
                                transition={{ delay: 0.8, duration: 0.5 }}
                                whileHover={{ scale: 1.1, rotate: 5 }}>

                                <motion.p
                                    className="text-4xl font-bold text-green-700"
                                    animate={{
                                        scale: [1, 1.1, 1]
                                    }}
                                    transition={{ duration: 2, repeat: Infinity }}>

                                    2018
                                </motion.p>
                                <p className="text-gray-700 text-sm">Berdiri Sejak</p>
                            </motion.div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Services Section - WITH CATEGORY TABS */}
            <section id="services" className="py-20 bg-amber-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        className="text-center mb-12"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: false, margin: "-100px" }}
                        transition={{ duration: 0.6 }}>

                        <Badge className="mb-4 bg-yellow-700 text-white">
                            Layanan Kami
                        </Badge>
                        <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
                            Layanan & Harga
                        </h2>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                            Pilihan lengkap untuk kesehatan dan kesejahteraan Anda
                        </p>
                    </motion.div>

                    {/* Category Tabs */}
                    <div className="flex justify-center gap-4 mb-12 flex-wrap">
                        {services.map((service) =>
                            <Button
                                key={service.id}
                                onClick={() => setActiveService(service.id)}
                                variant={activeService === service.id ? 'default' : 'outline'}
                                className={activeService === service.id ? 'bg-green-800 hover:bg-green-900 text-white' : 'border-green-800 text-green-800 hover:bg-green-50'}>

                                <service.icon className="w-4 h-4 mr-2" />
                                {service.title}
                            </Button>
                        )}
                    </div>

                    {/* Category Content with Alternating Layout */}
                    <AnimatePresence mode="wait">
                        {services.filter((s) => s.id === activeService).map((service) =>
                            <motion.div
                                key={service.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3 }}>

                                <Card className="bg-white border-amber-200 shadow-xl mb-8">
                                    <CardContent className="p-8">
                                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-yellow-700 mb-4">
                                            <service.icon className="w-8 h-8 text-white" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-gray-900 mb-2">{service.title}</h3>
                                        <p className="text-gray-600 mb-6">{service.description}</p>
                                    </CardContent>
                                </Card>

                                {/* LOADING STATE */}
                                {isLoadingProducts ?
                                    <div className="text-center py-12">
                                        <Loader2 className="w-12 h-12 animate-spin text-green-600 mx-auto mb-4" />
                                        <p className="text-gray-600">Memuat layanan...</p>
                                    </div> :
                                    service.treatments.length === 0 ?
                                        <div className="text-center py-12">
                                            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                            <p className="text-gray-600 mb-2">Layanan akan segera tersedia</p>
                                        </div> :

                                        <div className="space-y-20">
                                            {service.treatments.map((treatment, idx) =>
                                                <motion.div
                                                    key={idx}
                                                    initial={{ opacity: 0, y: 60 }}
                                                    whileInView={{ opacity: 1, y: 0 }}
                                                    viewport={{ once: false, margin: "-150px" }}
                                                    transition={{ duration: 0.8 }}
                                                    className={`grid md:grid-cols-2 gap-8 md:gap-12 items-center ${idx % 2 === 0 ? '' : 'md:grid-flow-dense'}`
                                                    }>

                                                    {/* Image */}
                                                    <motion.div
                                                        className={`relative overflow-hidden rounded-2xl shadow-2xl cursor-pointer ${idx % 2 === 0 ? '' : 'md:col-start-2'}`}
                                                        onClick={() => handleProductClick(treatment)}
                                                        whileHover={{ scale: 1.02 }}
                                                        whileInView={{
                                                            x: idx % 2 === 0 ? [50, 0] : [-50, 0],
                                                            opacity: [0, 1]
                                                        }}
                                                        viewport={{ once: false }}
                                                        transition={{ duration: 0.8 }}>

                                                        <div className="aspect-[4/3] bg-gray-100">
                                                            {treatment.image ?
                                                                <img
                                                                    src={treatment.image}
                                                                    alt={treatment.name}
                                                                    className="w-full h-full object-cover" /> :


                                                                <div className="w-full h-full flex items-center justify-center">
                                                                    <Package className="w-24 h-24 text-gray-400" />
                                                                </div>
                                                            }
                                                        </div>
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
                                                    </motion.div>

                                                    {/* Content */}
                                                    <motion.div
                                                        className={`${idx % 2 === 0 ? '' : 'md:col-start-1 md:row-start-1'}`}
                                                        whileInView={{
                                                            x: idx % 2 === 0 ? [-50, 0] : [50, 0],
                                                            opacity: [0, 1]
                                                        }}
                                                        viewport={{ once: false }}
                                                        transition={{ duration: 0.8 }}>

                                                        {treatment.category &&
                                                            <Badge className="mb-4 bg-green-100 text-green-900 border border-green-200">
                                                                {treatment.category}
                                                            </Badge>
                                                        }
                                                        <h3 
                                                            className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 cursor-pointer hover:text-green-800 transition-colors"
                                                            onClick={() => handleProductClick(treatment)}
                                                        >
                                                            {treatment.name}
                                                        </h3>
                                                        <p className="text-gray-600 text-lg mb-6 leading-relaxed">
                                                            {treatment.desc}
                                                        </p>
                                                        {treatment.duration &&
                                                            <p className="text-sm text-gray-500 mb-4 flex items-center gap-2">
                                                                <Clock className="w-4 h-4" />
                                                                {treatment.duration}
                                                            </p>
                                                        }
                                                        <motion.div
                                                            className="mb-6"
                                                            whileInView={{ scale: [0.95, 1] }}
                                                            viewport={{ once: false }}
                                                            transition={{ duration: 0.5 }}>

                                                            <p className="text-4xl font-bold text-green-800 mb-2">
                                                                Rp {treatment.price.toLocaleString('id-ID')}
                                                            </p>
                                                        </motion.div>
                                                        <motion.div
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}>

                                                            <Button
                                                                size="lg"
                                                                className="bg-green-800 hover:bg-green-900 text-white px-8 py-6 text-lg shadow-lg"
                                                                onClick={() => handleProductClick(treatment)}>

                                                                <MessageSquare className="w-5 h-5 mr-2" />
                                                                Pesan Layanan
                                                            </Button>
                                                        </motion.div>
                                                    </motion.div>
                                                </motion.div>
                                            )}
                                        </div>
                                }
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </section>

            {/* Products Showcase - HORIZONTAL SCROLL ON MOBILE */}
            <section id="products" className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        className="text-center mb-12"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: false, margin: "-100px" }}
                        transition={{ duration: 0.6 }}>

                        <Badge className="mb-4 bg-yellow-700 text-white">
                            <Package className="w-4 h-4 mr-2 inline" />
                            Semua Produk & Layanan
                        </Badge>
                        <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
                            Produk & Layanan Terbaik Kami
                        </h2>
                        <p className="text-xl text-gray-600 mb-6">
                            {isLoadingProducts ? 'Memuat...' : `${liveProducts.length} Produk & Layanan Tersedia`}
                        </p>
                        {defaultCompany &&
                            <p className="text-sm text-gray-500">
                                Data real-time dari: {defaultCompany.name}
                            </p>
                        }
                    </motion.div>

                    {isLoadingProducts ?
                        <div className="text-center py-12">
                            <Loader2 className="w-12 h-12 animate-spin text-green-600 mx-auto mb-4" />
                            <p className="text-gray-600">Memuat produk...</p>
                        </div> :
                        liveProducts.length === 0 ?
                            <div className="text-center py-12">
                                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-600">Produk akan segera tersedia</p>
                            </div> :

                            <>
                                {/* Mobile: Horizontal Scroll */}
                                <div className="md:hidden overflow-x-auto scrollbar-hide -mx-4 px-4 pb-4">
                                    <div className="flex gap-4" style={{ width: 'max-content' }}>
                                        {liveProducts.map((product, idx) =>
                                            <motion.div
                                                key={product.id}
                                                initial={{ opacity: 0, x: 40 }}
                                                whileInView={{ opacity: 1, x: 0 }}
                                                viewport={{ once: false, margin: "-80px" }}
                                                transition={{ delay: idx % 4 * 0.1, duration: 0.6 }}
                                                className="w-[280px] flex-shrink-0">

                                                <Card
                                                    className="overflow-hidden shadow-xl group bg-white h-full border border-gray-200"
                                                >
                                                    <div
                                                        className="aspect-square overflow-hidden bg-gray-100 relative cursor-pointer"
                                                        onClick={() => handleProductClick(product)}
                                                    >
                                                        <img
                                                            src={product.image_url || 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=400'}
                                                            alt={product.name}
                                                            className="w-full h-full object-cover" />

                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                                                            <Badge className="bg-green-800 text-white text-xs">
                                                                {product.unit || 'pcs'}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    <CardContent className="p-6">
                                                        <Badge className="mb-3 bg-green-100 text-green-900 border border-green-200 text-xs">
                                                            {product.category}
                                                        </Badge>
                                                        <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-1">
                                                            {product.name}
                                                        </h3>
                                                        {product.description &&
                                                            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                                                                {product.description}
                                                            </p>
                                                        }
                                                        <p className="text-2xl font-bold text-green-800 mb-4">
                                                            Rp {product.price.toLocaleString('id-ID')}
                                                        </p>
                                                        <Button
                                                            className="w-full bg-green-800 hover:bg-green-900 shadow-lg"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleProductClick(product);
                                                            }}>

                                                            <ShoppingCart className="w-4 h-4 mr-2" />
                                                            Beli Sekarang
                                                        </Button>
                                                    </CardContent>
                                                </Card>
                                            </motion.div>
                                        )}
                                    </div>
                                </div>

                                {/* Desktop: Grid */}
                                <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {liveProducts.map((product, idx) =>
                                        <motion.div
                                            key={product.id}
                                            initial={{ opacity: 0, y: 40 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            viewport={{ once: false, margin: "-80px" }}
                                            transition={{ delay: idx % 4 * 0.1, duration: 0.6 }}
                                            whileHover={{ y: -12, scale: 1.03 }}>

                                            <Card
                                                className="overflow-hidden hover:shadow-2xl transition-all duration-500 group bg-white h-full border border-gray-200"
                                            >
                                                <div
                                                    className="aspect-square overflow-hidden bg-gray-100 relative cursor-pointer"
                                                    onClick={() => handleProductClick(product)}
                                                >
                                                    <motion.img
                                                        src={product.image_url || 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=400'}
                                                        alt={product.name}
                                                        className="w-full h-full object-cover"
                                                        whileHover={{ scale: 1.15 }}
                                                        transition={{ duration: 0.6 }} />

                                                    <motion.div
                                                        className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-4"
                                                        initial={{ opacity: 0 }}
                                                        whileHover={{ opacity: 1 }}>

                                                        <Badge className="bg-green-800 text-white text-xs">
                                                            {product.unit || 'pcs'}
                                                        </Badge>
                                                    </motion.div>
                                                </div>
                                                <CardContent className="p-6">
                                                    <Badge className="mb-3 bg-green-100 text-green-900 border border-green-200 text-xs">
                                                        {product.category}
                                                    </Badge>
                                                    <h3 className="font-bold text-lg text-gray-900 mb-2 group-hover:text-green-800 transition-colors line-clamp-1">
                                                        {product.name}
                                                    </h3>
                                                    {product.description &&
                                                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                                                            {product.description}
                                                        </p>
                                                    }
                                                    <p className="text-2xl font-bold text-green-800 mb-4">
                                                        Rp {product.price.toLocaleString('id-ID')}
                                                    </p>
                                                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                                        <Button
                                                            className="w-full bg-green-800 hover:bg-green-900 shadow-lg"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleProductClick(product);
                                                            }}>

                                                            <ShoppingCart className="w-4 h-4 mr-2" />
                                                            Beli Sekarang
                                                        </Button>
                                                    </motion.div>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    )}
                                </div>
                            </>
                    }
                </div>
            </section>

            {/* Why Choose Us */}
            <section className="py-20 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-5xl font-bold text-green-900 mb-4">
                            Mengapa Memilih Kami?
                        </h2>
                        <p className="text-xl text-gray-600">
                            Komitmen kami untuk kualitas dan kepuasan Anda
                        </p>
                    </div>

                    <div className="grid md:grid-cols-4 gap-8">
                        {whyChooseUs.map((item, idx) =>
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: false, margin: "-100px" }}
                                transition={{ delay: idx * 0.15, duration: 0.6 }}
                                whileHover={{ y: -10, scale: 1.05 }}
                                className="text-center">

                                <motion.div
                                    className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-800 mb-4"
                                    whileHover={{ rotate: 360, scale: 1.1 }}
                                    transition={{ duration: 0.6 }}>

                                    <item.icon className="w-10 h-10 text-white" />
                                </motion.div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                                <p className="text-gray-600">{item.desc}</p>
                            </motion.div>
                        )}
                    </div>

                    <motion.div
                        className="mt-12 grid md:grid-cols-3 gap-6 text-center"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.5 }}>

                        {[
                            { icon: Users, value: '1,250+', label: 'Pengguna Aktif' },
                            { icon: Package, value: '150+', label: 'Produk Tersedia' },
                            { icon: Heart, value: '5,000+', label: 'Pelanggan Puas' }].
                            map((stat, idx) =>
                                <motion.div
                                    key={idx}
                                    className="bg-white rounded-xl p-6 shadow-lg border border-green-100"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: false, margin: "-80px" }}
                                    transition={{ delay: 0.6 + idx * 0.1 }}
                                    whileHover={{ scale: 1.08, y: -5 }}>

                                    <motion.div
                                        animate={{
                                            y: [0, -10, 0]
                                        }}
                                        transition={{ duration: 2, repeat: Infinity, delay: idx * 0.3 }}>

                                        <stat.icon className="w-12 h-12 mx-auto mb-3 text-green-800" />
                                    </motion.div>
                                    <motion.p
                                        className="text-3xl font-bold text-gray-900 mb-1"
                                        initial={{ opacity: 0 }}
                                        whileInView={{ opacity: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: 0.8 + idx * 0.1 }}>

                                        {stat.value}
                                    </motion.p>
                                    <p className="text-gray-600">{stat.label}</p>
                                </motion.div>
                            )}
                    </motion.div>
                </div>
            </section>

            {/* Testimonials */}
            <section id="testimonials" className="py-20 bg-green-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <Badge className="mb-4 bg-yellow-100 text-yellow-900 border border-yellow-200">
                            <Star className="w-4 h-4 mr-1 inline fill-current" />
                            Testimoni
                        </Badge>
                        <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
                            Dipercaya Ribuan Pelanggan
                        </h2>
                        <p className="text-xl text-gray-600">Lihat apa kata mereka</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {testimonials.map((testimonial, index) =>
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 40 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.15, duration: 0.6 }}
                                viewport={{ once: false, margin: "-100px" }}
                                whileHover={{ y: -10, scale: 1.03 }}>

                                <Card className="h-full hover:shadow-2xl transition-all duration-500 relative overflow-hidden bg-white border border-gray-200">
                                    {/* Animated background circle */}
                                    <motion.div
                                        className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/10 to-emerald-600/10 rounded-full -mr-16 -mt-16"
                                        animate={{
                                            scale: [1, 1.2, 1],
                                            rotate: [0, 90, 0]
                                        }}
                                        transition={{ duration: 8, repeat: Infinity }} />


                                    <CardContent className="p-6 relative">
                                        <motion.div
                                            className="flex items-center mb-4"
                                            initial={{ opacity: 0 }}
                                            whileInView={{ opacity: 1 }}
                                            transition={{ delay: index * 0.15 + 0.2 }}>

                                            {[...Array(testimonial.rating || 5)].map((_, i) =>
                                                <motion.div
                                                    key={i}
                                                    initial={{ opacity: 0, scale: 0 }}
                                                    whileInView={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: index * 0.15 + 0.3 + i * 0.05 }}>

                                                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                                </motion.div>
                                            )}
                                        </motion.div>
                                        <p className="text-gray-700 mb-6 italic">"{testimonial.content}"</p>
                                        <div className="flex items-center gap-3">
                                            <motion.div
                                                className="w-12 h-12 rounded-full bg-green-800 flex items-center justify-center text-white font-bold text-lg"
                                                whileHover={{ rotate: 360 }}
                                                transition={{ duration: 0.6 }}>

                                                {testimonial.name.charAt(0)}
                                            </motion.div>
                                            <div>
                                                <p className="font-semibold text-gray-900">{testimonial.name}</p>
                                                <p className="text-sm text-gray-600">{testimonial.role}</p>
                                                <p className="text-xs text-gray-500">
                                                    <MapPin className="w-3 h-3 inline mr-1" />
                                                    {testimonial.location}
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-gradient-to-br from-amber-100 via-yellow-50 to-orange-50 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{
                        backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                        backgroundSize: '40px 40px'
                    }}></div>
                </div>

                <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}>

                        <Badge className="mb-6 bg-green-800 text-white">
                            <Leaf className="w-4 h-4 mr-2 inline" />
                            Hubungi Kami
                        </Badge>
                        <h2 className="text-3xl md:text-5xl font-bold text-green-900 mb-6">
                            Siap Memulai Hidup Lebih Sehat?
                        </h2>
                        <p className="text-xl text-gray-700 mb-8">
                            Hubungi kami sekarang untuk konsultasi gratis atau pesan produk & layanan
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Button
                                size="lg"
                                className="text-lg px-8 py-6 bg-green-800 text-white hover:bg-green-900 shadow-2xl"
                                onClick={() => window.open('https://wa.me/6285279207959?text=Halo JAMU KITO', '_blank')}>

                                <MessageSquare className="mr-2 w-5 h-5" />
                                Chat WhatsApp
                            </Button>
                            {user &&
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="text-lg px-8 py-6 bg-white border-2 border-green-800 text-green-800 hover:bg-green-800 hover:text-white"
                                    onClick={handleGetStarted}>

                                    <Sparkles className="mr-2 w-5 h-5" />
                                    Buka Dashboard
                                </Button>
                            }
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Contact Section */}
            <section id="contact" className="py-20 bg-amber-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-2 gap-12">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-6">
                                Hubungi Kami
                            </h2>
                            <div className="space-y-4">
                                <div className="flex items-start gap-4 bg-white p-4 rounded-lg shadow border border-green-100">
                                    <Phone className="w-6 h-6 text-green-800 flex-shrink-0 mt-1" />
                                    <div>
                                        <p className="font-semibold text-gray-900">Telepon</p>
                                        <p className="text-gray-600">081-1717-7959</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 bg-white p-4 rounded-lg shadow border border-green-100">
                                    <Mail className="w-6 h-6 text-green-800 flex-shrink-0 mt-1" />
                                    <div>
                                        <p className="font-semibold text-gray-900">Email</p>
                                        <p className="text-gray-600">jamukito2023@gmail.com</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 bg-white p-4 rounded-lg shadow border border-green-100">
                                    <MapPin className="w-6 h-6 text-green-800 flex-shrink-0 mt-1" />
                                    <div>
                                        <p className="font-semibold text-gray-900">Lokasi</p>
                                        <p className="text-gray-600">Bengkulu, Indonesia</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 bg-white p-4 rounded-lg shadow border border-green-100">
                                    <Clock className="w-6 h-6 text-green-800 flex-shrink-0 mt-1" />
                                    <div>
                                        <p className="font-semibold text-gray-900">Jam Operasional</p>
                                        <p className="text-gray-600">Setiap Hari: 08:00 - 20:00 WIB</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-6">
                                Management Team
                            </h3>
                            <div className="grid grid-cols-3 gap-4">
                                {[
                                    { name: 'Aulia Wulandari', role: 'CEO' },
                                    { name: 'Febri Restu Winoto', role: 'Marketing' },
                                    { name: 'Chintia Puspita Sari', role: 'Pharmacy Assistant' }].
                                    map((member, idx) =>
                                        <div key={idx} className="text-center bg-white p-4 rounded-lg shadow border border-green-100">
                                            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-green-800 flex items-center justify-center text-white text-xl font-bold">
                                                {member.name.charAt(0)}
                                            </div>
                                            <p className="font-semibold text-sm text-gray-900">{member.name}</p>
                                            <p className="text-xs text-gray-600">{member.role}</p>
                                        </div>
                                    )}
                            </div>

                            <div className="mt-8 bg-yellow-700 p-6 rounded-xl text-white shadow-lg">
                                <h4 className="font-bold text-xl mb-4">Sertifikasi & Legalitas</h4>
                                <div className="space-y-2">
                                    <p className="flex items-center gap-2">
                                        <CheckCircle className="w-5 h-5" />
                                        Indonesia's Good Process Food Production Standards (CPPOB)
                                    </p>
                                    <p className="flex items-center gap-2">
                                        <CheckCircle className="w-5 h-5" />
                                        Certified by GMP for Traditional Medicine of Indonesia (CPOTB)
                                    </p>
                                    <p className="flex items-center gap-2">
                                        <CheckCircle className="w-5 h-5" />
                                        Registered by Indonesia's Drug and Food Control Agency (BPOM)
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-green-900 text-white py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-4 gap-8 mb-12">
                        <div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 inline-block mb-4">
                                <img
                                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6937a573d12f0f67c2233fb6/d0e698b3e_logo_jamu_kito-removebg-preview1.png"
                                    alt="JAMU KITO"
                                    className="h-16" />

                            </div>
                            <p className="text-gray-400 mb-4">PT JAMUKITO INTERNATIONAL</p>
                            <p className="text-sm text-gray-500 mb-4">Practical Healthy Living Every Day - Since 2018</p>
                        </div>

                        <div>
                            <h3 className="font-semibold mb-4 text-lg">Layanan Kami</h3>
                            <ul className="space-y-3 text-gray-400">
                                <li className="hover:text-white transition-colors cursor-pointer" onClick={() => { setActiveService('spa'); document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' }); }}>🧘 Spa & Terapi</li>
                                <li className="hover:text-white transition-colors cursor-pointer" onClick={() => { setActiveService('jamu'); document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' }); }}>🌿 Jamu Herbal</li>
                                <li className="hover:text-white transition-colors cursor-pointer" onClick={() => { setActiveService('madu'); document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' }); }}>☕ Cafe & Minuman</li>
                                <li className="hover:text-white transition-colors cursor-pointer" onClick={() => { document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }); }}>📦 Produk Retail</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-semibold mb-4 text-lg">Produk Kami</h3>
                            <ul className="space-y-3 text-gray-400">
                                <li className="hover:text-white transition-colors cursor-pointer" onClick={() => { document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }); }}>💊 Herbal Medicine</li>
                                <li className="hover:text-white transition-colors cursor-pointer" onClick={() => { document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }); }}>🍵 Botanical Drink Powder</li>
                                <li className="hover:text-white transition-colors cursor-pointer" onClick={() => { document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }); }}>🥤 Jamu Ready to Drink</li>
                                <li className="hover:text-white transition-colors cursor-pointer" onClick={() => { document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }); }}>🍯 Organic Honey</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-semibold mb-4 text-lg">Kontak</h3>
                            <ul className="space-y-3 text-gray-400">
                                <li className="flex items-start gap-2">
                                    <Mail className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                    <span>jamukito2023@gmail.com</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <Phone className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                    <span>085279207959</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                    <span>Bengkulu, Indonesia</span>
                                </li>
                            </ul>
                            <Button
                                className="mt-4 w-full bg-green-700 hover:bg-green-800"
                                onClick={() => {
                                    const phone = '6285279207959';
                                    window.open(`https://wa.me/${phone}`, '_blank');
                                }}>

                                <MessageSquare className="w-4 h-4 mr-2" />
                                Chat WhatsApp
                            </Button>
                        </div>
                    </div>

                    <div className="border-t border-gray-800 pt-8">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <p className="text-gray-400">&copy; 2025 PT JAMUKITO INTERNATIONAL. All rights reserved.</p>
                            <div className="flex gap-6 text-gray-400 text-sm">
                                <a href={createPageUrl('Privacy')} className="hover:text-white transition-colors">Privasi</a>
                                <a href={createPageUrl('Terms')} className="hover:text-white transition-colors">Syarat & Ketentuan</a>
                            </div>
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