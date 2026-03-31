import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, Loader2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function NewsletterTab() {
  const [subscribers, setSubscribers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSubscribers();
  }, []);

  const loadSubscribers = async () => {
    try {
      setIsLoading(true);
      const data = await base44.entities.NewsletterSubscriber.list('-created_date');
      setSubscribers(data || []);
    } catch (error) {
      toast.error('Gagal memuat subscribers');
    } finally {
      setIsLoading(false);
    }
  };

  const exportEmails = () => {
    const emails = subscribers.filter(s => s.is_active).map(s => s.email).join(', ');
    navigator.clipboard.writeText(emails);
    toast.success('✅ Email list disalin ke clipboard!');
  };

  const activeSubscribers = subscribers.filter(s => s.is_active);
  const inactiveSubscribers = subscribers.filter(s => !s.is_active);

  if (isLoading) {
    return <div className="flex items-center justify-center p-12">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Mail className="w-6 h-6 text-blue-500" />
            Newsletter Subscribers
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            {activeSubscribers.length} active subscribers
          </p>
        </div>
        <Button onClick={exportEmails} variant="outline" className="border-gray-700">
          <Download className="w-4 h-4 mr-2" />
          Export Emails
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-white mb-1">{activeSubscribers.length}</div>
            <div className="text-sm text-gray-400">Active Subscribers</div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-white mb-1">{inactiveSubscribers.length}</div>
            <div className="text-sm text-gray-400">Unsubscribed</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Subscriber List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {subscribers.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div className="flex-1">
                  <p className="text-white font-medium">{sub.email}</p>
                  {sub.name && <p className="text-gray-400 text-sm">{sub.name}</p>}
                  <p className="text-gray-500 text-xs mt-1">
                    Subscribed: {format(new Date(sub.created_date), 'dd MMM yyyy', { locale: id })}
                    {' • '}From: {sub.subscribed_from || 'website'}
                  </p>
                </div>
                <Badge className={sub.is_active ? 'bg-green-600' : 'bg-gray-600'}>
                  {sub.is_active ? 'Active' : 'Unsubscribed'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}