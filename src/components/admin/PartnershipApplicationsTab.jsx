import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Handshake, Eye, CheckCircle, XCircle, Mail, Phone, 
  ExternalLink, Loader2, Calendar, Send, MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function PartnershipApplicationsTab() {
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [meetingForm, setMeetingForm] = useState({ meeting_link: '', meeting_date: '', admin_notes: '' });

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setIsLoading(true);
      const data = await base44.entities.PartnershipApplication.list('-created_date');
      setApplications(data || []);
    } catch (error) {
      toast.error('Gagal memuat aplikasi');
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (id, status, additionalData = {}) => {
    try {
      await base44.entities.PartnershipApplication.update(id, {
        status,
        reviewed_by: (await base44.auth.me()).email,
        reviewed_date: new Date().toISOString(),
        ...additionalData
      });

      const app = applications.find(a => a.id === id);
      if (app) {
        let subject = '';
        let body = '';

        if (status === 'negotiation') {
          subject = `🤝 Partnership Discussion - ${app.partnership_type}`;
          body = `
            <h2>Halo, ${app.contact_name}!</h2>
            <p>Terima kasih atas aplikasi partnership Anda untuk <strong>${app.company_name}</strong>.</p>
            <p>Kami tertarik untuk diskusi lebih lanjut!</p>
            <p><strong>Detail Meeting:</strong></p>
            <ul>
              <li>Tanggal: ${additionalData.meeting_date ? format(new Date(additionalData.meeting_date), 'dd MMMM yyyy HH:mm', { locale: id }) : 'TBA'}</li>
              <li>Link: <a href="${additionalData.meeting_link}">${additionalData.meeting_link}</a></li>
            </ul>
            <p>Catatan: ${additionalData.admin_notes || ''}</p>
            <br/><p><strong>Tim Partnership SNISHOP</strong></p>
          `;
        } else if (status === 'approved') {
          subject = `✅ Partnership Approved - Welcome to SNISHOP!`;
          body = `
            <h2>Selamat, ${app.contact_name}!</h2>
            <p>Partnership application untuk <strong>${app.company_name}</strong> telah disetujui!</p>
            <p>Selamat bergabung sebagai partner resmi SNISHOP.</p>
            <p>Tim kami akan menghubungi Anda untuk proses onboarding.</p>
            <br/><p><strong>Tim Partnership SNISHOP</strong></p>
          `;
        }

        if (subject && body) {
          await base44.integrations.Core.SendEmail({ to: app.contact_email, subject, body });
          toast.success('Email terkirim!');
        }
      }

      toast.success('Status diupdate!');
      loadApplications();
      setShowDialog(false);
    } catch (error) {
      toast.error('Gagal update');
    }
  };

  const statusConfig = {
    submitted: { label: 'Baru', color: 'bg-blue-600' },
    reviewing: { label: 'Review', color: 'bg-yellow-600' },
    negotiation: { label: 'Negosiasi', color: 'bg-purple-600' },
    approved: { label: 'Approved', color: 'bg-green-600' },
    rejected: { label: 'Rejected', color: 'bg-red-600' }
  };

  if (isLoading) return <div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Handshake className="w-6 h-6 text-cyan-500" />
          Aplikasi Partnership ({applications.length})
        </h2>
        <Button onClick={loadApplications} variant="outline"><Eye className="w-4 h-4 mr-2" />Refresh</Button>
      </div>

      <div className="grid gap-4">
        {applications.map((app) => (
          <Card key={app.id} className="bg-gray-900 border-gray-700 hover:border-cyan-600 transition-all cursor-pointer" onClick={() => { setSelectedApp(app); setShowDialog(true); }}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-white mb-2">{app.company_name}</h4>
                  <p className="text-gray-400 mb-3">Type: {app.partnership_type} | Contact: {app.contact_name}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                    <span className="flex items-center gap-1"><Mail className="w-4 h-4" />{app.contact_email}</span>
                    <span className="flex items-center gap-1"><Phone className="w-4 h-4" />{app.contact_phone}</span>
                  </div>
                </div>
                <Badge className={statusConfig[app.status].color}>{statusConfig[app.status].label}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-gray-900 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Partnership Application Detail</DialogTitle></DialogHeader>
          {selectedApp && (
            <div className="space-y-6">
              <div className="p-4 bg-gray-800 rounded-lg">
                <h3 className="text-2xl font-bold text-white mb-2">{selectedApp.company_name}</h3>
                <p className="text-gray-400">Contact: {selectedApp.contact_name}</p>
                <Badge className={`${statusConfig[selectedApp.status].color} mt-2`}>{statusConfig[selectedApp.status].label}</Badge>
              </div>

              <div>
                <Label className="text-gray-300">Business Description</Label>
                <p className="text-white mt-2">{selectedApp.business_description}</p>
              </div>

              {selectedApp.proposal_url && (
                <Button variant="outline" onClick={() => window.open(selectedApp.proposal_url, '_blank')}>
                  <ExternalLink className="w-4 h-4 mr-2" />View Proposal
                </Button>
              )}

              {selectedApp.status === 'reviewing' && (
                <Card className="bg-purple-900/30 border-purple-700">
                  <CardContent className="p-4 space-y-4">
                    <Label className="text-white">Schedule Meeting</Label>
                    <Input value={meetingForm.meeting_link} onChange={(e) => setMeetingForm({ ...meetingForm, meeting_link: e.target.value })} placeholder="Meeting link..." className="bg-gray-800 border-gray-700 text-white" />
                    <Input type="datetime-local" value={meetingForm.meeting_date} onChange={(e) => setMeetingForm({ ...meetingForm, meeting_date: e.target.value })} className="bg-gray-800 border-gray-700 text-white" />
                    <Button onClick={() => updateStatus(selectedApp.id, 'negotiation', meetingForm)} className="w-full bg-purple-600">
                      <Send className="w-4 h-4 mr-2" />Send Meeting Invite
                    </Button>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-3">
                {selectedApp.status === 'submitted' && (
                  <Button onClick={() => updateStatus(selectedApp.id, 'reviewing')} className="bg-yellow-600">Start Review</Button>
                )}
                {(selectedApp.status === 'negotiation' || selectedApp.status === 'reviewing') && (
                  <>
                    <Button onClick={() => updateStatus(selectedApp.id, 'approved')} className="bg-green-600"><CheckCircle className="w-4 h-4 mr-2" />Approve</Button>
                    <Button onClick={() => updateStatus(selectedApp.id, 'rejected')} variant="outline" className="border-red-600 text-red-400"><XCircle className="w-4 h-4 mr-2" />Reject</Button>
                  </>
                )}
                <Button variant="outline" onClick={() => window.open(`https://wa.me/${selectedApp.contact_phone.replace(/[^0-9]/g, '')}`, '_blank')}>
                  <MessageSquare className="w-4 h-4 mr-2" />WhatsApp
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}