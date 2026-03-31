import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity, Users, Package, ShoppingCart, ArrowUpCircle, Wallet, 
  DollarSign, Tag, Lightbulb, Megaphone, ListCollapse, Home, 
  Settings, CreditCard, Briefcase, Handshake, Mail, BarChart2,
  ChevronRight, ChevronDown, Menu, X, Smartphone
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';

function SidebarContent({ activeTab, onTabChange, pendingCounts, onItemClick }) {
  const [expandedGroups, setExpandedGroups] = useState({
    dashboard: true,
    ecommerce: false,
    finance: false,
    system: false,
    payments: false,
    content: false
  });

  const toggleGroup = (groupKey) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  const menuGroups = [
    {
      key: 'dashboard',
      title: '📊 Dashboard & Users',
      icon: Activity,
      items: [
        { id: 'overview', label: 'Overview', icon: Activity },
        { id: 'users', label: 'User Management', icon: Users }
      ]
    },
    {
      key: 'ecommerce',
      title: '🛒 E-Commerce',
      icon: ShoppingCart,
      items: [
        { 
          id: 'products', 
          label: 'Products', 
          icon: Package 
        },
        { 
          id: 'orders', 
          label: 'Orders', 
          icon: ShoppingCart,
          badge: pendingCounts.orders
        },
        { 
          id: 'shop-settings', 
          label: 'Shop Settings', 
          icon: Settings 
        },
        { 
          id: 'product-vouchers', 
          label: 'Product Vouchers', 
          icon: Tag 
        }
      ]
    },
    {
      key: 'finance',
      title: '💰 Finance & Transactions',
      icon: DollarSign,
      items: [
        { 
          id: 'upgrade', 
          label: 'Upgrade Requests', 
          icon: ArrowUpCircle,
          badge: pendingCounts.upgrades
        },
        { 
          id: 'deposits', 
          label: 'Deposit Requests', 
          icon: Wallet,
          badge: pendingCounts.deposits
        },
        { 
          id: 'addons', 
          label: 'Addon Requests', 
          icon: Package,
          badge: pendingCounts.addons
        },
        { 
          id: 'withdrawals', 
          label: 'Withdrawal Requests', 
          icon: Wallet,
          badge: pendingCounts.withdrawals
        },
        { 
          id: 'commissions', 
          label: 'Commissions', 
          icon: DollarSign,
          badge: pendingCounts.commissions
        },
        { 
          id: 'revenue', 
          label: 'Revenue Analytics', 
          icon: BarChart2 
        },
        { 
          id: 'vouchers', 
          label: 'Membership Vouchers', 
          icon: Tag 
        },
        { 
          id: 'pricing', 
          label: 'Pricing Settings', 
          icon: DollarSign 
        },
        { 
          id: 'referral', 
          label: 'Referral Settings', 
          icon: Users 
        }
      ]
    },
    {
      key: 'payments',
      title: '💳 Payment & WhatsApp',
      icon: CreditCard,
      items: [
        { 
          id: 'payment_gateways', 
          label: 'All Gateways', 
          icon: CreditCard 
        },
        { 
          id: 'tripay_settings', 
          label: 'Tripay Settings', 
          icon: CreditCard 
        },
        { 
          id: 'stripe_settings', 
          label: 'Stripe Settings', 
          icon: CreditCard 
        },
        { 
          id: 'wablas_system', 
          label: 'Wablas API Default', 
          icon: Smartphone 
        }
      ]
    },
    {
      key: 'system',
      title: '⚙️ System & Settings',
      icon: Settings,
      items: [
        { 
          id: 'suggestions', 
          label: 'User Suggestions', 
          icon: Lightbulb,
          badge: pendingCounts.suggestions
        },
        { 
          id: 'broadcast', 
          label: 'Broadcast Messages', 
          icon: Megaphone 
        },
        { 
          id: 'changelog', 
          label: 'Changelog', 
          icon: ListCollapse 
        },
        { 
          id: 'home-settings', 
          label: 'Home Page Settings', 
          icon: Home 
        },
        { 
          id: 'menu-settings', 
          label: 'Menu Settings', 
          icon: Settings 
        },
        { 
          id: 'newsletter', 
          label: 'Newsletter', 
          icon: Mail 
        }
      ]
    },
    {
      key: 'content',
      title: '📝 Content Management',
      icon: ListCollapse,
      items: [
        { id: 'about', label: 'About Page', icon: Settings },
        { id: 'career', label: 'Career Page', icon: Briefcase },
        { 
          id: 'job-applications', 
          label: 'Job Applications', 
          icon: Briefcase 
        },
        { id: 'blog', label: 'Blog Content', icon: ListCollapse },
        { id: 'partnership', label: 'Partnership Page', icon: Handshake },
        { 
          id: 'partnership-applications', 
          label: 'Partnership Applications', 
          icon: Handshake 
        },
        { id: 'privacy', label: 'Privacy Policy', icon: Settings },
        { id: 'terms', label: 'Terms & Conditions', icon: Settings }
      ]
    }
  ];

  return (
    <div className="space-y-2">
      {menuGroups.map((group) => (
        <div key={group.key} className="space-y-1">
          <Button
            variant="ghost"
            onClick={() => toggleGroup(group.key)}
            className={cn(
              "w-full justify-between text-left text-white hover:bg-gray-700",
              expandedGroups[group.key] && "bg-gray-700"
            )}
          >
            <span className="flex items-center gap-2">
              <group.icon className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-semibold">{group.title}</span>
            </span>
            {expandedGroups[group.key] ? (
              <ChevronDown className="w-4 h-4 flex-shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 flex-shrink-0" />
            )}
          </Button>

          {expandedGroups[group.key] && (
            <div className="pl-4 space-y-1">
              {group.items.map((item) => (
                <Button
                  key={item.id}
                  variant="ghost"
                  onClick={() => {
                    onTabChange(item.id);
                    if (onItemClick) onItemClick();
                  }}
                  className={cn(
                    "w-full justify-start text-left text-gray-300 hover:bg-gray-700 hover:text-white",
                    activeTab === item.id && "bg-blue-600 text-white hover:bg-blue-700"
                  )}
                >
                  <item.icon className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="text-xs flex-1 truncate">{item.label}</span>
                  {item.badge > 0 && (
                    <Badge className="ml-2 h-5 px-1.5 text-xs bg-orange-600 flex-shrink-0">
                      {item.badge}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function AdminSidebar({ 
  activeTab, 
  onTabChange, 
  pendingCounts 
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Menu Button - Floating, tidak menutupi header utama */}
      <div className="lg:hidden fixed bottom-6 right-6 z-40">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              size="icon"
              className="h-14 w-14 rounded-full shadow-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 border-2 border-white dark:border-gray-800"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] bg-gray-800 border-gray-700 p-0">
            <SheetHeader className="p-4 border-b border-gray-700">
              <SheetTitle className="text-white text-lg flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Admin Menu
              </SheetTitle>
            </SheetHeader>
            <div className="p-4 overflow-y-auto max-h-[calc(100vh-80px)]">
              <SidebarContent 
                activeTab={activeTab}
                onTabChange={onTabChange}
                pendingCounts={pendingCounts}
                onItemClick={() => setIsOpen(false)}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-64 bg-gray-800 rounded-lg p-4 max-h-[calc(100vh-12rem)] overflow-y-auto">
        <SidebarContent 
          activeTab={activeTab}
          onTabChange={onTabChange}
          pendingCounts={pendingCounts}
        />
      </div>
    </>
  );
}