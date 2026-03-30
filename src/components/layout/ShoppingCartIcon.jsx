import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createPageUrl } from '@/utils';

export default function ShoppingCartIcon({ user }) {
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    if (user?.id) {
      loadCartCount();
      
      // ✅ Listen for cart updates
      const handleCartUpdate = () => {
        loadCartCount();
      };
      
      window.addEventListener('cartUpdated', handleCartUpdate);
      
      return () => {
        window.removeEventListener('cartUpdated', handleCartUpdate);
      };
    }
  }, [user]);

  const loadCartCount = async () => {
    try {
      const items = await base44.entities.ShoppingCart.filter({
        user_id: user.id
      });
      setCartCount((items || []).length);
    } catch (error) {
      console.warn('Failed to load cart count:', error);
      setCartCount(0);
    }
  };

  if (!user) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      onClick={() => window.location.href = createPageUrl('Cart')}
    >
      <ShoppingCart className="w-5 h-5" />
      {cartCount > 0 && (
        <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-600 text-white text-xs">
          {cartCount > 9 ? '9+' : cartCount}
        </Badge>
      )}
    </Button>
  );
}