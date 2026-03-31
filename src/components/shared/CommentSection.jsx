import { useState, useEffect } from 'react';
import { Comment } from '@/entities/Comment';
import { Notification } from '@/entities/Notification';
import { WorkspaceMember } from '@/entities/WorkspaceMember';
import { User } from '@/entities/User';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Reply, Edit, Trash2, AtSign } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

export default function CommentSection({ entityType, entityId, workspaceId, currentUser }) {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [replyingTo, setReplyingTo] = useState(null);
    const [editingComment, setEditingComment] = useState(null);
    const [members, setMembers] = useState([]);
    const [showMentions, setShowMentions] = useState(false);
    const [mentionSearch, setMentionSearch] = useState('');

    useEffect(() => {
        loadComments();
        loadMembers();
    }, [entityId]);

    const loadComments = async () => {
        try {
            const fetchedComments = await Comment.filter({ entity_type: entityType, entity_id: entityId }, '-created_date');
            setComments(fetchedComments || []);
        } catch (error) {
            console.error('Error loading comments:', error);
        }
    };

    const loadMembers = async () => {
        if (!workspaceId) return;
        try {
            const workspaceMembers = await WorkspaceMember.filter({ workspace_id: workspaceId });
            const memberDetails = [];
            for (const member of workspaceMembers || []) {
                const userDetails = await User.filter({ email: member.user_id });
                if (userDetails && userDetails.length > 0) {
                    memberDetails.push(userDetails[0]);
                }
            }
            setMembers(memberDetails);
        } catch (error) {
            console.error('Error loading members:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        try {
            const mentions = extractMentions(newComment);
            const commentData = {
                entity_type: entityType,
                entity_id: entityId,
                workspace_id: workspaceId,
                content: newComment,
                user_id: currentUser.email,
                user_name: currentUser.full_name,
                user_email: currentUser.email,
                mentions: mentions,
                parent_comment_id: replyingTo?.id || null
            };

            await Comment.create(commentData);

            for (const mentionedEmail of mentions) {
                await Notification.create({
                    user_id: mentionedEmail,
                    title: 'Anda di-mention dalam komentar',
                    message: `${currentUser.full_name} menyebut Anda dalam komentar: "${newComment.substring(0, 100)}..."`,
                    url: window.location.href
                });
            }

            setNewComment('');
            setReplyingTo(null);
            loadComments();
            toast.success('Komentar berhasil ditambahkan');
        } catch (error) {
            toast.error('Gagal menambahkan komentar');
        }
    };

    const handleEdit = async (comment, newContent) => {
        try {
            await Comment.update(comment.id, {
                content: newContent,
                edited_at: new Date().toISOString()
            });
            setEditingComment(null);
            loadComments();
            toast.success('Komentar berhasil diperbarui');
        } catch (error) {
            toast.error('Gagal memperbarui komentar');
        }
    };

    const handleDelete = async (commentId) => {
        if (!confirm('Yakin ingin menghapus komentar ini?')) return;
        try {
            await Comment.delete(commentId);
            loadComments();
            toast.success('Komentar berhasil dihapus');
        } catch (error) {
            toast.error('Gagal menghapus komentar');
        }
    };

    const extractMentions = (text) => {
        const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
        const mentions = [];
        let match;
        while ((match = mentionRegex.exec(text)) !== null) {
            mentions.push(match[2]);
        }
        return mentions;
    };

    const insertMention = (member) => {
        const mentionText = `@[${member.full_name}](${member.email}) `;
        setNewComment(newComment + mentionText);
        setShowMentions(false);
        setMentionSearch('');
    };

    const filteredMembers = members.filter(m =>
        m.full_name.toLowerCase().includes(mentionSearch.toLowerCase()) ||
        m.email.toLowerCase().includes(mentionSearch.toLowerCase())
    );

    const CommentItem = ({ comment, isReply = false }) => {
        const [isEditing, setIsEditing] = useState(false);
        const [editContent, setEditContent] = useState(comment.content);
        const replies = comments.filter(c => c.parent_comment_id === comment.id);

        return (
            <div className={`flex gap-3 ${isReply ? 'ml-12 mt-3' : 'mb-4'}`}>
                <Avatar className="w-8 h-8">
                    <AvatarFallback>{comment.user_name?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{comment.user_name}</span>
                        <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.created_date), { addSuffix: true, locale: localeId })}
                            {comment.edited_at && ' (diedit)'}
                        </span>
                    </div>
                    {isEditing ? (
                        <div className="space-y-2">
                            <Textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="text-sm"
                            />
                            <div className="flex gap-2">
                                <Button size="sm" onClick={() => {
                                    handleEdit(comment, editContent);
                                    setIsEditing(false);
                                }}>Simpan</Button>
                                <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>Batal</Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                            {comment.user_email === currentUser.email && (
                                <div className="flex gap-2 mt-2">
                                    <Button variant="ghost" size="sm" onClick={() => setReplyingTo(comment)}>
                                        <Reply className="w-3 h-3 mr-1" />
                                        Balas
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                                        <Edit className="w-3 h-3 mr-1" />
                                        Edit
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(comment.id)}>
                                        <Trash2 className="w-3 h-3 mr-1" />
                                        Hapus
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                    {replies.length > 0 && (
                        <div className="mt-3 space-y-3">
                            {replies.map(reply => (
                                <CommentItem key={reply.id} comment={reply} isReply={true} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const rootComments = comments.filter(c => !c.parent_comment_id);

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">Komentar ({comments.length})</h3>
            
            <form onSubmit={handleSubmit} className="space-y-2">
                {replyingTo && (
                    <div className="text-sm text-muted-foreground bg-gray-50 p-2 rounded flex justify-between items-center">
                        <span>Membalas: {replyingTo.user_name}</span>
                        <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)}>Batal</Button>
                    </div>
                )}
                <div className="relative">
                    <Textarea
                        value={newComment}
                        onChange={(e) => {
                            setNewComment(e.target.value);
                            if (e.target.value.endsWith('@')) {
                                setShowMentions(true);
                            }
                        }}
                        placeholder="Tulis komentar... Gunakan @ untuk mention"
                        rows={3}
                    />
                    {showMentions && (
                        <div className="absolute bottom-full mb-2 w-full bg-white border rounded-lg shadow-lg p-2 max-h-48 overflow-y-auto z-10">
                            <Input
                                placeholder="Cari member..."
                                value={mentionSearch}
                                onChange={(e) => setMentionSearch(e.target.value)}
                                className="mb-2"
                            />
                            {filteredMembers.map(member => (
                                <Button
                                    key={member.email}
                                    variant="ghost"
                                    className="w-full justify-start"
                                    onClick={() => insertMention(member)}
                                >
                                    <Avatar className="w-6 h-6 mr-2">
                                        <AvatarFallback>{member.full_name?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="text-left">
                                        <div className="text-sm font-semibold">{member.full_name}</div>
                                        <div className="text-xs text-muted-foreground">{member.email}</div>
                                    </div>
                                </Button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex justify-between items-center">
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowMentions(!showMentions)}>
                        <AtSign className="w-4 h-4 mr-1" />
                        Mention
                    </Button>
                    <Button type="submit" size="sm">
                        <Send className="w-4 h-4 mr-1" />
                        Kirim
                    </Button>
                </div>
            </form>

            <div className="space-y-4">
                {rootComments.length > 0 ? (
                    rootComments.map(comment => (
                        <CommentItem key={comment.id} comment={comment} />
                    ))
                ) : (
                    <p className="text-center text-muted-foreground py-8">Belum ada komentar. Jadilah yang pertama!</p>
                )}
            </div>
        </div>
    );
}