import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createPageUrl } from '@/utils';
import { initialProducts } from '../data/initialProducts';
import { Button } from "@/components/ui/button";

import { Badge } from '@/components/ui/badge';
import {
    Leaf, Phone, Clock, MapPin, Star, CheckCircle, ArrowRight,
    Package, Coffee, Droplet, Heart, Users, Award, Shield,
    Menu, X, ChevronRight, MessageSquare, Mail, Sparkles,
    ShoppingCart,
    Quote as QuoteIcon
} from 'lucide-react';
import { motion } from 'framer-motion';

import bgJamukito from '../assets/bg  jamukito.jpg';

import ProductDetailModal from '../components/shop/ProductDetailModal';
import { toast } from 'sonner';

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
                        console.log('✅ METHOD 0: Success:', targetCompany?.name || 'JAMU KITO');
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
        } catch {
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
        } catch {
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
                description: 'Pilihan produk jamu berkualitas tinggi dengan sertifikasi BPOM untuk kesehatan alami harian Anda',
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
                description: 'Nikmati berbagai layanan spa dengan terapis profesional dan ramah langsung di tempat Anda',
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
                description: 'Produk madu asli pilihan dan minuman serbuk herbal praktis untuk kesejahteraan Anda',
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
            icon: Users,
            title: 'Artisan Terapis Profesional',
            desc: 'Tenaga ahli tersertifikasi dengan filosofi Hospitality from the Heart untuk pengalaman transformatif.'
        },
        {
            icon: Award,
            title: 'Sertifikasi Gold Standard',
            desc: 'Jaminan keamanan total melalui akreditasi BPOM, CPOTB, dan CPPOB pada setiap lini produk.'
        },
        {
            icon: Leaf,
            title: 'Seleksi Botani Premium',
            desc: 'Ekstraksi bahan herbal terbaik Nusantara yang dikurasi secara ketat untuk kemurnian maksimal.'
        },
        {
            icon: MapPin,
            title: 'Layanan Concierge Eksklusif',
            desc: 'Kenyamanan tanpa kompromi melalui layanan kunjungan profesional tanpa biaya tambahan.'
        }];


    const testimonials = [
        {
            name: 'Ibu Siti Rahayu',
            role: 'VIP Wellness Member',
            content: 'Transformasi kesehatan saya terasa nyata sejak beralih ke ritual herbal Jamu Kito. Hasilnya melebihi ekspektasi!',
            rating: 5,
            location: 'Bengkulu'
        },
        {
            name: 'Bpk. Bambang Suherman',
            role: 'SaaS Entrepreneur',
            content: 'Standardisasi layanan terapinya luar biasa. Sangat eksklusif dan profesional, cocok untuk gaya hidup dinamis.',
            rating: 5,
            location: 'Jakarta'
        },
        {
            name: 'Dr. Maya Kusuma',
            role: 'Clinical Wellness Consultant',
            content: 'Sebagai praktisi, saya sangat mengapresiasi kemurnian bahan baku dan akurasi dosis dalam setiap produk herbal mereka.',
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
                                    variant="default"
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
                                        variant="default"
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
                className="relative min-h-screen flex items-center justify-center md:justify-start overflow-hidden bg-[#022c22]"
            >
                {/* Dynamic Background */}
                <div className="absolute inset-0 z-0">
                    <motion.div
                        className="absolute inset-0 opacity-60 md:opacity-100 bg-cover bg-center md:bg-right"
                        style={{
                            backgroundImage: `url(${bgJamukito})`,
                            scale: 1.05
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
                    {/* Premium Dark Overlay Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-b md:bg-gradient-to-r from-black/80 via-[#022c22]/90 to-transparent" />
                    
                    {/* Animated Mesh Gradients */}
                    <div className="absolute top-1/4 left-1/4 md:left-1/4 -translate-x-1/2 w-[80%] md:w-[60%] h-[60%] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" />
                </div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10 w-full pt-32 pb-20">
                    <div className="flex flex-col items-center md:items-start text-center md:text-left md:max-w-3xl">
                        
                        {/* Status Pill */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                            className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10 mb-8"
                        >
                            <Sparkles className="w-4 h-4 text-amber-400" />
                            <span className="text-white/90 text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em]">
                                Since 2018 - Practical Healthy Living Every Day
                            </span>
                        </motion.div>

                        {/* Main Typography */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 1, delay: 0.2 }}
                            className="space-y-4 mb-10"
                        >
                            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[0.9] tracking-tighter uppercase font-sans">
                                PT JAMUKITO <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-200 to-amber-400">
                                    INTERNATIONAL
                                </span>
                            </h1>
                            <div className="h-1 w-24 bg-gradient-to-r from-emerald-500 to-amber-500 mx-auto md:mx-0 rounded-full" />
                            <p className="text-lg sm:text-xl md:text-2xl font-bold text-emerald-400/90 tracking-wide">
                                Jamu, Spa & Herbal Wellness
                            </p>
                            <p className="text-base sm:text-lg md:text-xl text-white/70 italic font-light leading-relaxed md:max-w-xl">
                                "Your TRULY Solutions for Health & Wellness"
                            </p>
                        </motion.div>

                        {/* CTA Actions */}
                        <motion.div 
                            className="flex flex-col sm:flex-row gap-4 mb-10 sm:mb-16 md:mb-20"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                        >
                            <Button 
                                variant="default"
                                size="lg"
                                onClick={handleGetStarted}
                                className="bg-white hover:bg-emerald-50 text-green-900 px-8 py-5 sm:px-10 sm:py-6 md:px-12 md:py-7 text-base md:text-lg font-extrabold rounded-2xl shadow-2xl transition-all hover:-translate-y-1 active:scale-95"
                            >
                                Pesan Sekarang
                            </Button>
                            
                            <Button 
                                variant="outline"
                                size="lg"
                                className="bg-white/5 border-white/20 text-white px-8 py-5 sm:px-10 sm:py-6 md:px-12 md:py-7 text-base md:text-lg font-bold rounded-2xl backdrop-blur-xl hover:bg-white/10 hover:border-white/40 transition-all flex items-center gap-3"
                                onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
                            >
                                Lihat Layanan
                                <ChevronRight className="w-5 h-5" />
                            </Button>
                        </motion.div>

                        {/* 2x2 Trust Grid - The Premium Brand Signature */}
                        <motion.div 
                            className="grid grid-cols-2 gap-4 sm:gap-6 w-full max-w-4xl"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1 }}
                        >
                            {[
                                { title: 'Terapis Ramah', desc: '& Profesional', icon: Users },
                                { title: 'Sediaan Terdaftar', desc: 'BPOM RI', icon: Shield },
                                { title: 'Bahan Alami', desc: 'Pilihan Terbaik', icon: Leaf },
                                { title: 'Layanan Terpercaya', desc: 'Sejak 2018', icon: Award }
                            ].map((item, idx) => (
                                <div 
                                    key={idx}
                                    className="group p-4 sm:p-5 md:p-6 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/5 hover:border-emerald-500/30 transition-all duration-500 text-left flex items-start gap-4"
                                >
                                    <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
                                        <item.icon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold text-xs sm:text-sm md:text-base leading-tight">{item.title}</h3>
                                        <p className="text-emerald-400/60 text-[10px] sm:text-xs md:text-sm font-medium">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    </div>
                </div>
            </section>



            {/* About Section - THE ESSENCE */}
            <section id="about" className="py-16 sm:py-24 md:py-32 bg-white relative overflow-hidden">
                {/* Subtle Background Elements */}
                <div className="absolute top-0 right-0 w-1/3 h-full bg-emerald-50/50 -skew-x-12 translate-x-1/2" />
                
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="grid lg:grid-cols-2 gap-10 sm:gap-16 md:gap-20 items-center">
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

                            <h2 className="text-3xl sm:text-4xl md:text-6xl font-display font-black text-gray-900 mb-8 leading-[1.1] tracking-tighter">
                                Membawa <span className="text-emerald-700 italic">Kearifan Lokal</span><br />
                                ke Gaya Hidup Modern.
                            </h2>

                            <p className="text-gray-600 mb-8 text-base sm:text-lg md:text-xl leading-relaxed font-light max-w-xl">
                                PT. Jamu Kito Internasional is a modern herbal company committed to bringing the wisdom of Indonesian traditional medicine (jamu) into today's lifestyle. From handcrafted jamu recipes to modern herbal drinks, our products are designed for people who seek balance — between tradition and innovation, nature and science.
                            </p>

                            <div className="grid sm:grid-cols-2 gap-8 mb-12">
                                <motion.div 
                                    className="p-5 rounded-xl sm:p-6 sm:rounded-2xl md:p-8 md:rounded-[2rem] bg-emerald-50 border border-emerald-100 hover:shadow-xl transition-all duration-500 group"
                                    whileHover={{ y: -5 }}
                                >
                                    <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                        <Eye className="text-white w-6 h-6" />
                                    </div>
                                    <h4 className="font-display font-black text-emerald-900 text-xl mb-3 tracking-tight">VISI</h4>
                                    <p className="text-emerald-800/70 text-sm leading-relaxed">
                                        To become a global ambassador of Indonesian herbal wellness.
                                    </p>
                                </motion.div>

                                <motion.div 
                                    className="p-5 rounded-xl sm:p-6 sm:rounded-2xl md:p-8 md:rounded-[2rem] bg-amber-50 border border-amber-100 hover:shadow-xl transition-all duration-500 group"
                                    whileHover={{ y: -5 }}
                                >
                                    <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                        <Target className="text-white w-6 h-6" />
                                    </div>
                                    <h4 className="font-display font-black text-amber-900 text-xl mb-3 tracking-tight">MISI</h4>
                                    <p className="text-amber-800/70 text-sm leading-relaxed">
                                        To preserve and modernize Indonesia's herbal traditions.
                                    </p>
                                </motion.div>
                            </div>

                            <Button
                                variant="default"
                                size="lg"
                                className="bg-emerald-900 hover:bg-emerald-950 text-white rounded-full px-6 py-5 sm:px-8 sm:py-6 md:px-10 md:py-7 text-base md:text-lg font-bold shadow-2xl shadow-emerald-900/20 group"
                                onClick={handleGetStarted}
                            >
                                Pelajari Lebih Lanjut
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
                                className="absolute -bottom-6 -left-4 p-5 sm:-bottom-8 sm:-left-6 sm:p-6 md:-bottom-10 md:-left-10 md:p-8 bg-white/80 backdrop-blur-2xl rounded-[1.5rem] sm:rounded-[2rem] md:rounded-[2.5rem] shadow-2xl border border-white flex flex-col items-center justify-center"
                                initial={{ opacity: 0, scale: 0.8 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.5 }}
                                whileHover={{ scale: 1.05, rotate: -2 }}
                            >
                                <span className="text-3xl sm:text-4xl md:text-5xl font-display font-black text-emerald-900 leading-none">2018</span>
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
            <section id="services" className="py-16 sm:py-24 relative overflow-hidden bg-white">
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

                        <Badge 
                            variant="secondary"
                            className="mb-6 px-5 py-2 bg-emerald-900/5 text-emerald-800 border-emerald-200/50 font-black tracking-[0.3em] uppercase text-[10px] rounded-full"
                        >
                            Wellness Selection
                        </Badge>
                        <h2 className="text-4xl sm:text-5xl md:text-7xl font-sans font-black text-emerald-950 mb-6 sm:mb-8 tracking-tighter leading-[0.9]">
                            LAYANAN & <span className="text-amber-600">HARGA</span>
                        </h2>
                        <p className="text-base sm:text-xl text-emerald-900/60 max-w-2xl mx-auto leading-relaxed font-light font-sans">
                            Elegansi tradisional bertemu dengan kenyamanan modern. Temukan rangkaian layanan wellness eksklusif yang dirancang khusus untuk memulihkan energi dan vitalitas Anda secara alami.
                        </p>
                    </motion.div>

                    {/* Premium Category Tabs - Pill Style */}
                    <div className="w-full overflow-x-auto scrollbar-hide mb-12 sm:mb-20 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 flex sm:justify-center">
                        <div className="inline-flex p-1.5 bg-white shadow-2xl shadow-emerald-900/5 rounded-full border border-emerald-100/50 backdrop-blur-xl shrink-0 min-w-max">
                            {services.map((service) => (
                                <button
                                    key={service.id}
                                    onClick={() => setActiveService(service.id)}
                                    className={`relative px-4 sm:px-6 py-2.5 sm:py-3 rounded-full text-xs sm:text-sm font-bold transition-all duration-500 overflow-hidden ${
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
                                <div className="mb-16 sm:mb-24 text-center max-w-3xl mx-auto">
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.5 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ 
                                            type: "spring", 
                                            stiffness: 260, 
                                            damping: 20,
                                            delay: 0.2 
                                        }}
                                        className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-[2rem] sm:rounded-[2.5rem] bg-emerald-900 text-white shadow-2xl shadow-emerald-900/40 mb-8 sm:mb-10 -rotate-6 hover:rotate-0 transition-transform duration-700"
                                    >
                                        <service.icon className="w-8 h-8 sm:w-10 sm:h-10" />
                                    </motion.div>
                                    <h3 className="text-3xl sm:text-4xl md:text-6xl font-sans font-black text-emerald-950 mb-4 sm:mb-6 tracking-tight leading-none uppercase">{service.title}</h3>
                                    <p className="text-emerald-900/60 text-base sm:text-xl leading-relaxed font-light italic font-sans">{service.description}</p>
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
                                    <div className="space-y-20 sm:space-y-32">
                                        {service.treatments.map((treatment, idx) => (
                                            <motion.div
                                                key={idx}
                                                initial={{ opacity: 0, y: 100 }}
                                                whileInView={{ opacity: 1, y: 0 }}
                                                viewport={{ once: true, margin: "-100px" }}
                                                transition={{ duration: 0.8, delay: idx * 0.1 }}
                                                className={`grid lg:grid-cols-2 gap-10 sm:gap-16 lg:gap-24 items-center ${idx % 2 === 0 ? '' : 'lg:grid-flow-dense'}`}
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
                                                            className="text-3xl sm:text-4xl md:text-5xl font-display font-black text-emerald-950 mb-4 sm:mb-6 leading-tight cursor-pointer hover:text-emerald-700 transition-colors duration-300"
                                                            onClick={() => handleProductClick(treatment)}
                                                        >
                                                            {treatment.name}
                                                        </h3>
                                                        <p className="text-base sm:text-lg text-emerald-900/60 mb-6 sm:mb-8 leading-relaxed font-medium">
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

                                                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-8 sm:mt-12">
                                                            <Button
                                                                variant="default"
                                                                size="lg"
                                                                className="relative w-full sm:w-auto group overflow-hidden bg-emerald-900 hover:bg-emerald-950 text-white px-8 sm:px-10 py-6 sm:py-8 rounded-2xl font-black text-base sm:text-lg shadow-2xl shadow-emerald-950/20 border-none transition-all duration-500 hover:-translate-y-1 active:scale-95"
                                                                onClick={() => handleProductClick(treatment)}
                                                            >
                                                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-800 to-emerald-950 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                                                <span className="relative z-10 flex items-center justify-center gap-3">
                                                                    <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
                                                                    Reservasi Eksklusif
                                                                </span>
                                                            </Button>
                                                            
                                                            <Button
                                                                variant="outline"
                                                                size="lg"
                                                                className="w-full sm:w-auto px-8 sm:px-10 py-6 sm:py-8 rounded-2xl border-2 border-emerald-900/10 hover:border-emerald-900/30 hover:bg-emerald-900/5 text-emerald-900 font-black text-base sm:text-lg transition-all duration-500"
                                                                onClick={() => handleProductClick(treatment)}
                                                            >
                                                                Detail Layanan
                                                            </Button>
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
            <section id="produk" className="py-16 sm:py-24 bg-white relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none opacity-[0.03] overflow-hidden w-full text-center">
                    <span className="text-[15vw] sm:text-[20vw] font-black text-emerald-900 leading-none tracking-tighter uppercase">COLLECTIONS</span>
                </div>
                
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <motion.div
                        className="text-center mb-20"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}>

                        <Badge 
                            variant="secondary"
                            className="mb-8 px-6 py-2.5 bg-emerald-900/5 text-emerald-800 border-emerald-200/50 font-black tracking-[0.4em] uppercase text-[10px] rounded-full"
                        >
                            Curated Masterpieces
                        </Badge>
                        <h2 className="text-4xl sm:text-5xl md:text-8xl font-sans font-black text-emerald-950 mb-6 sm:mb-10 tracking-tighter leading-[0.8] uppercase">
                            HERITA<span className="text-transparent bg-clip-text bg-gradient-to-b from-amber-500 to-amber-700">GE</span><br className="sm:hidden" /> COLLECTION
                        </h2>
                        <p className="text-base sm:text-lg md:text-2xl text-emerald-900/60 max-w-3xl mx-auto leading-relaxed font-light font-sans italic">
                            Mahakarya Kesehatan Nusantara, diekstraksi dari bahan botani terbaik dan disempurnakan melalui riset modern untuk menghadirkan kualitas hidup yang prestisius.
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
                            <p className="text-emerald-900/40 font-bold uppercase tracking-widest text-sm animate-pulse">Menyiapkan Koleksi...</p>
                        </div>
                    ) : liveProducts.length === 0 ? (
                        <div className="text-center py-32 bg-emerald-50 rounded-[3rem] border border-emerald-100">
                            <Package className="w-20 h-20 text-emerald-200 mx-auto mb-6" />
                            <p className="text-emerald-900/40 text-xl font-medium italic">Koleksi baru segera hadir</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
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
                                    <div className="relative h-full flex flex-col bg-white border border-emerald-100 rounded-[2.5rem] overflow-hidden transition-all duration-700 hover:border-emerald-300 hover:shadow-[0_20px_50px_rgba(5,150,105,0.1)]">
                                        
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
                                                <Badge variant="default" className="bg-emerald-900/80 backdrop-blur-md text-emerald-50 border-emerald-800/40 text-[10px] font-black tracking-widest uppercase">
                                                    {product.category || 'Retail'}
                                                </Badge>
                                                {product.unit && (
                                                    <div className="w-10 h-10 bg-white/40 backdrop-blur-md rounded-full flex items-center justify-center border border-emerald-100/50">
                                                        <span className="text-[10px] font-black text-emerald-900 uppercase">{product.unit}</span>
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
                                            <h3 className="text-xl font-bold text-emerald-950 mb-2 leading-tight group-hover:text-emerald-700 transition-colors">
                                                {product.name}
                                            </h3>
                                            
                                            <div className="mt-auto pt-6">
                                                <div className="flex items-center justify-between gap-4 mb-6">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] text-emerald-900/30 uppercase tracking-widest font-bold mb-1">Investasi</span>
                                                        <span className="text-2xl font-black text-emerald-950 tracking-tighter">
                                                            <span className="text-emerald-600 text-sm align-top mr-1">RP</span>
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
                                                    className="w-full py-4 px-6 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-950 text-sm font-bold uppercase tracking-widest hover:bg-emerald-100 transition-all flex items-center justify-center gap-2"
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

            {/* Excellence Grid - THE LIGHT STANDARD */}
            <section className="py-16 sm:py-24 md:py-32 bg-emerald-50/50 relative overflow-hidden">
                {/* Visual Anchors */}
                <div className="absolute top-0 right-0 w-1/2 h-full bg-emerald-950/5 -skew-x-12 translate-x-1/2 pointer-events-none" />
                <div className="absolute top-1/4 left-10 w-64 h-64 bg-emerald-200/20 rounded-full blur-[100px] animate-pulse" />
                
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="grid lg:grid-cols-2 gap-12 sm:gap-16 lg:gap-20 items-center mb-16 sm:mb-24">
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                        >
                            <span className="text-emerald-600 font-black tracking-[0.4em] text-[10px] uppercase mb-6 block">
                                Practical Healthy Living
                            </span>
                            <h2 className="text-3xl sm:text-4xl md:text-7xl font-display font-black text-emerald-950 mb-6 sm:mb-8 leading-[0.9] tracking-tighter">
                                MENGAPA<br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-emerald-900">JAMU KITO?</span>
                            </h2>
                            <p className="text-base sm:text-lg md:text-xl text-emerald-900/60 leading-relaxed max-w-lg mb-8 sm:mb-10 font-light font-sans">
                                Kami menetapkan standar baru dalam kesehatan herbal, menggabungkan kemurnian alam dengan akurasi modern untuk kualitas hidup yang tak tertandingi.
                            </p>
                            
                            <div className="flex gap-6 sm:gap-10">
                                <div>
                                    <p className="text-3xl sm:text-4xl font-black text-emerald-950 mb-1">100%</p>
                                    <p className="text-[8px] sm:text-[10px] text-emerald-600 uppercase tracking-widest font-bold">Natural Purity</p>
                                </div>
                                <div className="w-[1px] h-10 sm:h-12 bg-emerald-200 mt-1" />
                                <div>
                                    <p className="text-3xl sm:text-4xl font-black text-emerald-950 mb-1">BPOM</p>
                                    <p className="text-[8px] sm:text-[10px] text-emerald-600 uppercase tracking-widest font-bold">Certified Quality</p>
                                </div>
                            </div>
                        </motion.div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {whyChooseUs.map((item, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, scale: 0.9, y: 30 }}
                                    whileInView={{ opacity: 1, scale: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ 
                                        delay: idx * 0.1, 
                                        duration: 0.8,
                                        ease: [0.22, 1, 0.36, 1]
                                    }}
                                    className="p-8 sm:p-10 rounded-3xl sm:rounded-[3rem] bg-white/70 border border-emerald-100 backdrop-blur-2xl hover:bg-white hover:border-emerald-300 hover:shadow-2xl hover:shadow-emerald-900/5 transition-all duration-700 group relative overflow-hidden"
                                >
                                    {/* Glass Highlight */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                    
                                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-emerald-900 rounded-2xl sm:rounded-[1.5rem] flex items-center justify-center mb-6 sm:mb-8 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-700 shadow-2xl shadow-emerald-900/20">
                                        <item.icon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                                    </div>
                                    <h3 className="text-xl sm:text-2xl font-black text-emerald-950 mb-3 sm:mb-4 tracking-tighter group-hover:text-emerald-700 transition-colors duration-500">{item.title}</h3>
                                    <p className="text-emerald-900/40 text-base leading-relaxed font-light italic">{item.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Infinite Success Ticker - Ultra Modern */}
                    <motion.div
                        className="py-12 sm:py-20 border-t border-emerald-100 flex flex-col sm:flex-row flex-wrap justify-between items-center gap-10 sm:gap-12"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.5 }}>
                        
                        {[
                            { icon: Users, value: '1,250+', label: 'Elite Patients' },
                            { icon: Package, value: '150+', label: 'Artisan Products' },
                            { icon: Heart, value: '5,000+', label: 'Curated Reviews' }
                        ].map((stat, idx) => (
                            <div key={idx} className="flex-1 min-w-[200px] text-center group cursor-default">
                                <stat.icon className="w-8 h-8 text-emerald-900/20 mx-auto mb-6 group-hover:text-emerald-600 group-hover:scale-110 transition-all duration-700" />
                                <p className="text-4xl sm:text-5xl md:text-7xl font-black text-emerald-950 mb-2 sm:mb-3 tracking-tighter group-hover:text-emerald-600 transition-colors duration-700">
                                    {stat.value}
                                </p>
                                <p className="text-[10px] text-emerald-900/20 uppercase tracking-[0.5em] font-black">{stat.label}</p>
                            </div>
                        ))}
                    </motion.div>
                </div>
            </section>


            {/* Testimonials - THE LUXURY REVIEW */}
            <section id="testimoni" className="py-16 sm:py-24 md:py-40 bg-white relative overflow-hidden">
                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-emerald-50/50 to-transparent pointer-events-none" />
                <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-amber-100/30 rounded-full blur-[120px] pointer-events-none" />
                
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="text-center mb-16 sm:mb-24 md:mb-32">
                        <Badge 
                            variant="secondary"
                            className="mb-8 px-6 py-2.5 bg-emerald-900/5 text-emerald-800 border-emerald-200/50 font-black tracking-[0.4em] uppercase text-[10px] rounded-full"
                        >
                            Global Wellness Standard
                        </Badge>
                        <h2 className="text-4xl sm:text-5xl md:text-8xl font-display font-black text-emerald-950 mb-6 sm:mb-10 tracking-tighter leading-[0.8] uppercase">
                            VOICE OF <span className="italic text-emerald-800">EXCELLENCE</span>
                        </h2>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-2">
                            <div className="flex items-center">
                                {[1, 2, 3, 4, 5].map((_, i) => (
                                    <Star key={i} className="w-5 h-5 sm:w-6 sm:h-6 fill-amber-400 text-amber-400" />
                                ))}
                            </div>
                            <span className="sm:ml-5 mt-2 sm:mt-0 text-emerald-900/40 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em]">
                                5.0 Precision Rated &bull; 1,250+ Verified Rituals
                            </span>
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
                                className="relative p-6 sm:p-8 md:p-10 rounded-3xl sm:rounded-[3rem] bg-emerald-50/50 border border-emerald-100/50 hover:bg-white hover:shadow-2xl hover:shadow-emerald-900/10 transition-all duration-700 group"
                            >
                                <QuoteIcon className="absolute top-6 right-6 sm:top-8 sm:right-10 w-12 h-12 sm:w-16 sm:h-16 text-emerald-900/5 group-hover:text-emerald-900/10 transition-colors" />
                                
                                <div className="relative z-10">
                                    <div className="flex gap-1 mb-6 sm:mb-8">
                                        {[...Array(testimonial.rating)].map((_, i) => (
                                            <Star key={i} className="w-3 h-3 sm:w-4 sm:h-4 fill-amber-400 text-amber-400" />
                                        ))}
                                    </div>
                                    
                                    <p className="text-lg sm:text-xl md:text-2xl font-light text-emerald-950 mb-8 sm:mb-10 leading-relaxed italic">
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

            {/* CTA & Contact Section - CLEAN LIGHT THEME */}
            <section id="kontak" className="relative py-16 sm:py-24 md:py-32 bg-white overflow-hidden">
                <div className="absolute inset-0 opacity-[0.05]">
                    <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #064e3b 1px, transparent 0)', backgroundSize: '60px 60px' }} />
                </div>
                
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="grid lg:grid-cols-2 gap-12 sm:gap-16 lg:gap-20 items-center">
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            <Badge variant="default" className="mb-8 px-5 py-2 bg-emerald-900 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-full">
                                Connect With Us
                            </Badge>
                            <h2 className="text-4xl sm:text-5xl md:text-7xl font-display font-black text-emerald-950 mb-6 sm:mb-8 leading-[0.9] tracking-tighter">
                                MULAI HIDUP<br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-emerald-900">LEBIH SEHAT.</span>
                            </h2>
                            <p className="text-base sm:text-lg md:text-xl text-emerald-900/60 leading-relaxed mb-8 sm:mb-12 max-w-lg font-light font-sans">
                                Hubungi konsultan kesehatan kami sekarang atau kunjungi pusat layanan Jamu Kito terdekat.
                            </p>
                            
                            <div className="space-y-6">
                                {[
                                    { icon: Phone, title: 'Priority Line', val: '081-1717-7959', color: 'bg-emerald-100 text-emerald-700' },
                                    { icon: Mail, title: 'Official Email', val: 'jamukito2023@gmail.com', color: 'bg-amber-100 text-amber-700' },
                                    { icon: MapPin, title: 'Elite Lounge', val: 'Bengkulu, Indonesia', color: 'bg-emerald-100 text-emerald-700' }
                                ].map((item, i) => (
                                    <motion.div 
                                        key={i} 
                                        className="flex items-center gap-4 sm:gap-6 p-5 sm:p-6 rounded-[2rem] sm:rounded-3xl bg-emerald-50/50 border border-emerald-100 hover:bg-emerald-100 transition-all cursor-pointer group"
                                        whileHover={{ x: 10 }}
                                    >
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform shadow-sm`}>
                                            <item.icon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase font-black tracking-widest text-emerald-900/30 mb-1">{item.title}</p>
                                            <p className="text-lg font-bold text-emerald-950 tracking-tight">{item.val}</p>
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
                                className="p-10 rounded-[3rem] bg-emerald-50 border border-emerald-100 shadow-2xl relative z-10"
                            >
                                <h3 className="text-2xl font-bold text-emerald-950 mb-8 tracking-tight">Luxury Certification</h3>
                                <div className="space-y-8">
                                    {[
                                        { title: 'CPPOB Certified', desc: "Indonesia's Food Production Standard" },
                                        { title: 'CPOTB Approved', desc: "GMP for Traditional Medicine" },
                                        { title: 'BPOM Registered', desc: "Elite Health & Safety Assurance" }
                                    ].map((cert, i) => (
                                        <div key={i} className="flex gap-5">
                                            <div className="w-6 h-6 bg-emerald-900 rounded-full flex-shrink-0 flex items-center justify-center">
                                                <CheckCircle className="w-4 h-4 text-white" />
                                            </div>
                                            <div>
                                                <p className="text-emerald-950 font-bold text-lg leading-none mb-2">{cert.title}</p>
                                                <p className="text-emerald-900/40 text-sm leading-relaxed">{cert.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                <Button
                                    size="lg"
                                    className="w-full mt-12 bg-emerald-900 hover:bg-emerald-800 text-white py-8 rounded-[2rem] text-lg font-black uppercase tracking-widest shadow-2xl shadow-emerald-900/20"
                                    onClick={() => window.open('https://wa.me/6285279207959', '_blank')}
                                >
                                    <MessageSquare className="w-6 h-6 mr-3" />
                                    Bicara Sekarang
                                </Button>
                            </motion.div>
                            
                            {/* Visual Decoration */}
                            <div className="absolute -top-10 -right-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] -z-10" />
                        </div>
                    </div>
                </div>
            </section>


            {/* Footer - THE OMEGA LAYER */}
            <footer className="bg-emerald-50/30 text-emerald-950 py-16 sm:py-24 relative border-t border-emerald-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 sm:gap-16 mb-16 sm:mb-24">
                        <div className="col-span-1 lg:col-span-1">
                            <div className="flex items-center gap-4 mb-8">
                                <img
                                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6937a573d12f0f67c2233fb6/d0e698b3e_logo_jamu_kito-removebg-preview1.png"
                                    alt="JAMU KITO"
                                    className="h-12 w-auto filter drop-shadow-md brightness-75 contrast-125" 
                                />
                            </div>
                            <p className="text-emerald-900/50 text-sm leading-relaxed mb-8 max-w-xs font-medium font-sans">
                                Harmoni tradisi dan inovasi modern untuk masa depan kesehatan yang berkelanjutan. Pioneer wellness nusantara sejak 2018.
                            </p>
                            <div className="flex gap-4">
                                {['instagram', 'facebook', 'twitter'].map((social) => (
                                    <motion.div 
                                        key={social}
                                        whileHover={{ scale: 1.1, y: -2 }}
                                        className="w-10 h-10 rounded-full bg-white border border-emerald-100 flex items-center justify-center cursor-pointer hover:bg-emerald-900 hover:text-white transition-all shadow-sm"
                                    >
                                        <div className="w-4 h-4 uppercase text-[8px] font-black">{social.charAt(0)}</div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-emerald-900 font-black uppercase tracking-[0.3em] text-[10px] mb-8">Layanan Premium</h3>
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
                                        className="text-emerald-900/40 hover:text-emerald-950 transition-colors cursor-pointer text-sm font-bold flex items-center gap-3 group"
                                    >
                                        <div className="w-1 h-1 bg-emerald-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                        {link.name}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-emerald-900 font-black uppercase tracking-[0.3em] text-[10px] mb-8">Informasi Bisnis</h3>
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
                                        className="text-emerald-900/40 hover:text-emerald-950 transition-colors cursor-pointer text-sm font-bold flex items-center gap-3 group"
                                    >
                                        <div className="w-1 h-1 bg-emerald-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                        {link.name}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-emerald-900 font-black uppercase tracking-[0.3em] text-[10px] mb-8">Lounge Lokasi</h3>
                            <div className="p-6 rounded-3xl bg-white border border-emerald-100 shadow-sm">
                                <p className="text-sm font-bold text-emerald-950 mb-2 leading-none">Bengkulu Global Hub</p>
                                <p className="text-xs text-emerald-900/40 leading-relaxed mb-6 font-medium italic">
                                    Jl. Jend. Sudirman No. 45<br />
                                    Bengkulu, Indonesia 38114
                                </p>
                                <Button
                                    variant="outline"
                                    className="w-full bg-emerald-50 border-emerald-100 text-emerald-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100"
                                    onClick={() => window.open('https://maps.google.com', '_blank')}
                                >
                                    Dapatkan Arahan
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 sm:pt-12 border-t border-emerald-100 flex flex-col md:flex-row justify-between items-center gap-6 sm:gap-8 text-center md:text-left">
                        <p className="text-[10px] text-emerald-900/20 font-bold uppercase tracking-[0.4em]">
                            &copy; 2025 PT JAMUKITO INTERNATIONAL. ALL RIGHTS RESERVED.
                        </p>
                        <div className="flex flex-wrap justify-center md:justify-end gap-6 sm:gap-10">
                            {['Privasi', 'Ketentuan', 'Cookies'].map((link) => (
                                <a key={link} href="#" className="text-[10px] text-emerald-900/20 hover:text-emerald-600 font-bold uppercase tracking-[0.4em] transition-colors">{link}</a>
                            ))}
                        </div>
                    </div>
                </div>
            </footer>


            {/* Product Detail Modal */}
            {showProductDetail && selectedProduct && (
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
            )}
        </div>);

}