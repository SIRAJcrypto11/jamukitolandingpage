import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Copy, Save } from 'lucide-react';
import { Note } from '@/entities/Note';
import { toast } from 'sonner';

export default function MessageBubble({ message }) {
    const isUser = message.role === 'user';

    const handleCopyToClipboard = () => {
        navigator.clipboard.writeText(message.content);
        toast.success("Teks berhasil disalin!");
    };

    const handleSaveToNotes = async () => {
        try {
            const title = message.content.substring(0, 40) + '... (dari AI)';
            // This assumes a personal workspace exists. A more robust solution would check or create one.
            const personalWorkspace = await Note.filter({is_personal: true});
            const defaultWorkspaceId = personalWorkspace.length > 0 ? personalWorkspace[0].id : null;
            if(!defaultWorkspaceId) {
                toast.error("Workspace pribadi tidak ditemukan untuk menyimpan catatan.");
                return;
            }
            await Note.create({
                title: title,
                content: message.content,
                workspace_id: defaultWorkspaceId, 
            });
            toast.success("Berhasil disimpan ke Catatan!");
        } catch (error) {
            console.error("Gagal menyimpan ke catatan:", error);
            toast.error("Gagal menyimpan ke catatan.");
        }
    };

    return (
        <div className={`flex items-start gap-3 ${isUser ? 'justify-end' : ''}`}>
            {!isUser && (
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
            )}
            <div className={`max-w-xl rounded-2xl px-4 py-3 relative group ${isUser ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700'}`}>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
                {!isUser && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopyToClipboard}>
                            <Copy className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSaveToNotes}>
                            <Save className="w-4 h-4" />
                        </Button>
                    </div>
                )}
            </div>
             {isUser && (
                 <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-gray-600 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
            )}
        </div>
    );
}