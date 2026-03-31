import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function NewsletterForm({ source = 'blog' }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Email wajib diisi');
      return;
    }

    try {
      setIsSubmitting(true);

      // Check if already subscribed
      const existing = await base44.entities.NewsletterSubscriber.filter({ email });
      if (existing && existing.length > 0) {
        toast.error('Email sudah terdaftar untuk newsletter');
        return;
      }

      await base44.entities.NewsletterSubscriber.create({
        email,
        name: name || null,
        subscribed_from: source,
        is_active: true
      });

      toast.success('✅ Berhasil subscribe newsletter! Terima kasih.');
      setEmail('');
      setName('');
    } catch (error) {
      toast.error('Gagal subscribe newsletter');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 border-blue-700">
      <CardContent className="p-8">
        <div className="text-center mb-6">
          <Mail className="w-12 h-12 text-blue-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-white mb-2">
            Subscribe Newsletter
          </h3>
          <p className="text-gray-300">
            Dapatkan update artikel terbaru dan tips bisnis langsung ke email Anda
          </p>
        </div>
        <form onSubmit={handleSubscribe} className="space-y-4">
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama Anda (optional)"
            className="bg-gray-800 border-gray-700 text-white"
          />
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email Anda"
            className="bg-gray-800 border-gray-700 text-white"
            required
          />
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Subscribe
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}