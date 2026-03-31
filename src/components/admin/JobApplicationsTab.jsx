import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Briefcase, Eye, CheckCircle, XCircle, Calendar, Mail, 
  Phone, Link as LinkIcon, FileText, Star, Loader2, Send,
  ExternalLink, MessageSquare, Download, Save
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function JobApplicationsTab() {
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [interviewForm, setInterviewForm] = useState({
    interview_link: '',
    interview_date: '',
    admin_notes: ''
  });

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setIsLoading(true);
      const data = await base44.entities.JobApplication.list('-created_date');
      setApplications(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Gagal memuat lamaran');
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (applicationId, newStatus, additionalData = {}) => {
    try {
      setIsProcessing(true);
      
      await base44.entities.JobApplication.update(applicationId, {
        status: newStatus,
        reviewed_by: (await base44.auth.me()).email,
        reviewed_date: new Date().toISOString(),
        ...additionalData
      });

      const app = applications.find(a => a.id === applicationId);
      if (app) {
        let emailSubject = '';
        let emailBody = '';

        if (newStatus === 'interview_scheduled') {
          emailSubject = `🎉 Interview Invitation - ${app.position_applied}`;
          emailBody = `
            <h2>Selamat, ${app.applicant_name}!</h2>
            <p>Lamaran Anda untuk posisi <strong>${app.position_applied}</strong> telah lolos tahap screening.</p>
            <p><strong>Detail Interview:</strong></p>
            <ul>
              <li>Tanggal: ${additionalData.interview_date ? format(new Date(additionalData.interview_date), 'dd MMMM yyyy HH:mm', { locale: id }) : 'TBA'}</li>
              <li>Link: <a href="${additionalData.interview_link}">${additionalData.interview_link}</a></li>
            </ul>
            <p>Catatan: ${additionalData.admin_notes || 'Harap datang tepat waktu'}</p>
            <br/>
            <p>Kami berharap dapat bertemu dengan Anda!</p>
            <p><strong>Tim HR SNISHOP</strong></p>
          `;
        } else if (newStatus === 'accepted') {
          emailSubject = `✅ Congratulations - You're Hired!`;
          emailBody = `
            <h2>Selamat, ${app.applicant_name}!</h2>
            <p>Kami dengan senang hati menerima Anda sebagai <strong>${app.position_applied}</strong> di SNISHOP!</p>
            <p>Tim HR kami akan segera menghubungi Anda untuk proses onboarding selanjutnya.</p>
            <p>Selamat bergabung di keluarga SNISHOP! 🎉</p>
            <br/>
            <p><strong>Tim HR SNISHOP</strong></p>
          `;
        } else if (newStatus === 'rejected') {
          emailSubject = `Update Lamaran - ${app.position_applied}`;
          emailBody = `
            <h2>Halo, ${app.applicant_name}</h2>
            <p>Terima kasih telah melamar posisi <strong>${app.position_applied}</strong> di SNISHOP.</p>
            <p>Setelah melalui proses seleksi yang ketat, kami memutuskan untuk melanjutkan dengan kandidat lain yang lebih sesuai dengan kebutuhan kami saat ini.</p>
            <p>Kami sangat menghargai waktu dan usaha Anda dalam proses aplikasi ini. Jangan berkecil hati, dan kami mendorong Anda untuk melamar kembali di masa depan untuk posisi yang sesuai dengan keahlian Anda.</p>
            <p>Semoga sukses dalam pencarian karir Anda!</p>
            <br/>
            <p><strong>Tim HR SNISHOP</strong></p>
          `;
        }

        if (emailSubject && emailBody) {
          await base44.integrations.Core.SendEmail({
            to: app.applicant_email,
            subject: emailSubject,
            body: emailBody
          });
          toast.success('✅ Email notifikasi terkirim!');
        }
      }

      toast.success('Status berhasil diupdate!');
      loadApplications();
      setShowDetailDialog(false);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Gagal update status');
    } finally {
      setIsProcessing(false);
    }
  };

  const scheduleInterview = async () => {
    if (!interviewForm.interview_link || !interviewForm.interview_date) {
      toast.error('Link dan tanggal interview wajib diisi');
      return;
    }

    await updateStatus(selectedApplication.id, 'interview_scheduled', interviewForm);
    setInterviewForm({ interview_link: '', interview_date: '', admin_notes: '' });
  };

  const statusConfig2 = {
    submitted: { label: 'Baru', color: 'bg-blue-600', icon: FileText },
    screening: { label: 'Screening', color: 'bg-yellow-600', icon: Eye },
    interview_scheduled: { label: 'Interview Dijadwalkan', color: 'bg-purple-600', icon: Calendar },
    interview_completed: { label: 'Interview Selesai', color: 'bg-indigo-600', icon: CheckCircle },
    accepted: { label: 'Diterima', color: 'bg-green-600', icon: CheckCircle },
    rejected: { label: 'Ditolak', color: 'bg-red-600', icon: XCircle }
  };

  const groupedApplications = {
    submitted: applications.filter(a => a.status === 'submitted'),
    screening: applications.filter(a => a.status === 'screening'),
    interview_scheduled: applications.filter(a => a.status === 'interview_scheduled'),
    interview_completed: applications.filter(a => a.status === 'interview_completed'),
    accepted: applications.filter(a => a.status === 'accepted'),
    rejected: applications.filter(a => a.status === 'rejected')
  };

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
            <Briefcase className="w-6 h-6 text-green-500" />
            Manajemen Lamaran Kerja
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            {applications.length} total lamaran
          </p>
        </div>
        <Button onClick={loadApplications} variant="outline" className="border-gray-700">
          <Eye className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {Object.entries(groupedApplications).map(([status, apps]) => {
          const config = statusConfig2[status];
          return (
            <Card key={status} className="bg-gray-900 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <config.icon className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-400">{config.label}</span>
                </div>
                <div className="text-2xl font-bold text-white">{apps.length}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="space-y-4">
        {Object.entries(groupedApplications).map(([status, apps]) => {
          if (apps.length === 0) return null;
          const config = statusConfig2[status];
          
          return (
            <div key={status}>
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <Badge className={config.color}>{config.label}</Badge>
                <span className="text-gray-400 text-sm">({apps.length})</span>
              </h3>
              <div className="grid gap-4">
                {apps.map((app) => (
                  <Card key={app.id} className="bg-gray-900 border-gray-700 hover:border-blue-600 transition-all cursor-pointer" onClick={() => { setSelectedApplication(app); setShowDetailDialog(true); }}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-lg font-bold text-white mb-2">{app.applicant_name}</h4>
                          <p className="text-gray-400 mb-3">Posisi: {app.position_applied}</p>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                            <span className="flex items-center gap-1">
                              <Mail className="w-4 h-4" />
                              {app.applicant_email}
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone className="w-4 h-4" />
                              {app.applicant_phone}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {format(new Date(app.created_date), 'dd MMM yyyy', { locale: id })}
                            </span>
                          </div>
                          {app.rating && (
                            <div className="flex items-center gap-1 mt-3">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`w-4 h-4 ${i < app.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />
                              ))}
                            </div>
                          )}
                        </div>
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedApplication(app); setShowDetailDialog(true); }}>
                          <Eye className="w-4 h-4 mr-2" />
                          Detail
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="bg-gray-900 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Detail Lamaran Kerja</DialogTitle>
          </DialogHeader>

          {selectedApplication && (
            <div className="space-y-6">
              <div className="p-4 bg-gray-800 rounded-lg">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-white">{selectedApplication.applicant_name}</h3>
                    <p className="text-gray-400">Melamar: {selectedApplication.position_applied}</p>
                  </div>
                  <Badge className={statusConfig2[selectedApplication.status].color}>
                    {statusConfig2[selectedApplication.status].label}
                  </Badge>
                </div>
                <div className="grid md:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-gray-300">
                    <Mail className="w-4 h-4" />
                    {selectedApplication.applicant_email}
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <Phone className="w-4 h-4" />
                    {selectedApplication.applicant_phone}
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <Calendar className="w-4 h-4" />
                    Dilamar: {format(new Date(selectedApplication.created_date), 'dd MMMM yyyy', { locale: id })}
                  </div>
                  {selectedApplication.experience_years && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Briefcase className="w-4 h-4" />
                      {selectedApplication.experience_years} tahun pengalaman
                    </div>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-3">
                {selectedApplication.cv_url && (
                  <Button variant="outline" className="w-full" onClick={() => window.open(selectedApplication.cv_url, '_blank')}>
                    <Download className="w-4 h-4 mr-2" />
                    Download CV
                  </Button>
                )}
                {selectedApplication.portfolio_url && (
                  <Button variant="outline" className="w-full" onClick={() => window.open(selectedApplication.portfolio_url, '_blank')}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Portfolio
                  </Button>
                )}
                {selectedApplication.linkedin_url && (
                  <Button variant="outline" className="w-full" onClick={() => window.open(selectedApplication.linkedin_url, '_blank')}>
                    <LinkIcon className="w-4 h-4 mr-2" />
                    LinkedIn
                  </Button>
                )}
              </div>

              {selectedApplication.cover_letter && (
                <div>
                  <Label className="text-gray-300 font-semibold mb-2 block">Cover Letter</Label>
                  <div className="p-4 bg-gray-800 rounded-lg text-gray-300 whitespace-pre-wrap">
                    {selectedApplication.cover_letter}
                  </div>
                </div>
              )}

              {(selectedApplication.expected_salary || selectedApplication.current_salary) && (
                <div className="grid md:grid-cols-2 gap-4">
                  {selectedApplication.current_salary && (
                    <div>
                      <Label className="text-gray-400 text-xs">Current Salary</Label>
                      <p className="text-white font-semibold">{selectedApplication.current_salary}</p>
                    </div>
                  )}
                  {selectedApplication.expected_salary && (
                    <div>
                      <Label className="text-gray-400 text-xs">Expected Salary</Label>
                      <p className="text-white font-semibold">{selectedApplication.expected_salary}</p>
                    </div>
                  )}
                </div>
              )}

              {selectedApplication.skills && selectedApplication.skills.length > 0 && (
                <div>
                  <Label className="text-gray-300 font-semibold mb-2 block">Skills</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedApplication.skills.map((skill, idx) => (
                      <Badge key={idx} variant="outline" className="border-blue-600 text-blue-400">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label className="text-gray-300 font-semibold mb-2 block">Rating Kandidat</Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      onClick={async () => {
                        await base44.entities.JobApplication.update(selectedApplication.id, { rating });
                        setSelectedApplication({ ...selectedApplication, rating });
                        loadApplications();
                        toast.success('Rating disimpan');
                      }}
                      className="focus:outline-none"
                    >
                      <Star className={`w-8 h-8 ${selectedApplication.rating >= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-gray-300 font-semibold mb-2 block">Catatan Admin</Label>
                <Textarea
                  value={selectedApplication.admin_notes || ''}
                  onChange={(e) => setSelectedApplication({ ...selectedApplication, admin_notes: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="Catatan internal tentang kandidat..."
                />
                <Button
                  size="sm"
                  className="mt-2"
                  onClick={async () => {
                    await base44.entities.JobApplication.update(selectedApplication.id, {
                      admin_notes: selectedApplication.admin_notes
                    });
                    toast.success('Catatan disimpan');
                  }}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Simpan Catatan
                </Button>
              </div>

              {selectedApplication.status === 'screening' && (
                <Card className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 border-purple-700">
                  <CardHeader>
                    <CardTitle className="text-white text-lg">Jadwalkan Interview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-gray-300">Link Interview (Zoom/Meet)</Label>
                      <Input
                        value={interviewForm.interview_link}
                        onChange={(e) => setInterviewForm({ ...interviewForm, interview_link: e.target.value })}
                        placeholder="https://zoom.us/j/..."
                        className="bg-gray-800 border-gray-700 text-white mt-2"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Tanggal & Waktu</Label>
                      <Input
                        type="datetime-local"
                        value={interviewForm.interview_date}
                        onChange={(e) => setInterviewForm({ ...interviewForm, interview_date: e.target.value })}
                        className="bg-gray-800 border-gray-700 text-white mt-2"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Catatan untuk Kandidat</Label>
                      <Textarea
                        value={interviewForm.admin_notes}
                        onChange={(e) => setInterviewForm({ ...interviewForm, admin_notes: e.target.value })}
                        placeholder="Instruksi khusus untuk interview..."
                        className="bg-gray-800 border-gray-700 text-white mt-2"
                      />
                    </div>
                    <Button
                      onClick={scheduleInterview}
                      disabled={isProcessing}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                      {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                      Kirim Undangan Interview
                    </Button>
                  </CardContent>
                </Card>
              )}

              {selectedApplication.interview_link && (
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white text-lg">Info Interview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-gray-400 text-xs">Tanggal</Label>
                      <p className="text-white">{selectedApplication.interview_date && format(new Date(selectedApplication.interview_date), 'dd MMMM yyyy HH:mm', { locale: id })}</p>
                    </div>
                    <div>
                      <Label className="text-gray-400 text-xs">Link</Label>
                      <a href={selectedApplication.interview_link} target="_blank" className="text-blue-400 hover:underline flex items-center gap-1">
                        {selectedApplication.interview_link}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-700">
                {selectedApplication.status === 'submitted' && (
                  <Button
                    onClick={() => updateStatus(selectedApplication.id, 'screening')}
                    disabled={isProcessing}
                    className="bg-yellow-600 hover:bg-yellow-700"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Mulai Screening
                  </Button>
                )}

                {selectedApplication.status === 'interview_scheduled' && (
                  <Button
                    onClick={() => updateStatus(selectedApplication.id, 'interview_completed')}
                    disabled={isProcessing}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark Interview Selesai
                  </Button>
                )}

                {(selectedApplication.status === 'interview_completed' || selectedApplication.status === 'screening') && (
                  <>
                    <Button
                      onClick={() => updateStatus(selectedApplication.id, 'accepted')}
                      disabled={isProcessing}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Terima Kandidat
                    </Button>
                    <Button
                      onClick={() => {
                        const reason = prompt('Alasan penolakan (akan dikirim ke kandidat):');
                        if (reason) {
                          updateStatus(selectedApplication.id, 'rejected', { rejection_reason: reason });
                        }
                      }}
                      disabled={isProcessing}
                      variant="outline"
                      className="border-red-600 text-red-400 hover:bg-red-600/10"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Tolak
                    </Button>
                  </>
                )}

                <Button
                  variant="outline"
                  onClick={() => window.open(`https://wa.me/${selectedApplication.applicant_phone.replace(/[^0-9]/g, '')}`, '_blank')}
                  className="border-green-600 text-green-400"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Chat WhatsApp
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {applications.length === 0 && (
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-12 text-center">
            <Briefcase className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">Belum ada lamaran masuk</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}