import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function CommentSection({ articleId }) {
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadUser();
    loadComments();
  }, [articleId]);

  const loadUser = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
    } catch (error) {
      // Not logged in
    }
  };

  const loadComments = async () => {
    try {
      setIsLoading(true);
      const data = await base44.entities.BlogComment.filter({ 
        article_id: articleId,
        is_approved: true 
      });
      setComments(data || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const submitComment = async () => {
    if (!currentUser) {
      toast.error('Silakan login untuk berkomentar');
      base44.auth.redirectToLogin(window.location.pathname);
      return;
    }

    if (!commentText.trim()) {
      toast.error('Tulis komentar terlebih dahulu');
      return;
    }

    try {
      setIsSubmitting(true);
      
      await base44.entities.BlogComment.create({
        article_id: articleId,
        user_id: currentUser.id,
        user_name: currentUser.full_name || currentUser.email,
        user_email: currentUser.email,
        comment_text: commentText,
        is_approved: true
      });

      toast.success('✅ Komentar berhasil ditambahkan!');
      setCommentText('');
      loadComments();
    } catch (error) {
      toast.error('Gagal mengirim komentar');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-white flex items-center gap-2">
        <MessageSquare className="w-6 h-6 text-blue-400" />
        Komentar ({comments.length})
      </h3>

      {/* Comment Form */}
      {currentUser ? (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Tulis komentar Anda..."
              className="bg-gray-900 border-gray-600 text-white mb-4"
            />
            <Button
              onClick={submitComment}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Kirim Komentar
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6 text-center">
            <p className="text-gray-400 mb-4">Silakan login untuk berkomentar</p>
            <Button onClick={() => base44.auth.redirectToLogin(window.location.pathname)}>
              Login
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
          </div>
        ) : comments.length > 0 ? (
          comments.map((comment) => (
            <Card key={comment.id} className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-blue-600 text-white">
                      {comment.user_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-white">{comment.user_name}</span>
                      <span className="text-gray-500 text-xs">
                        {format(new Date(comment.created_date), 'dd MMM yyyy', { locale: id })}
                      </span>
                    </div>
                    <p className="text-gray-300">{comment.comment_text}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-12 text-center">
              <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">Belum ada komentar</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}