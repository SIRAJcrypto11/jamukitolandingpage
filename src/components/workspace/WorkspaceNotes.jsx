import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, FileText, Search, Pin, Clock, Tag } from 'lucide-react';
import { Note } from '@/entities/Note';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

const NOTE_COLORS = [
  { bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800', dot: 'bg-blue-400' },
  { bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-200 dark:border-green-800', dot: 'bg-green-400' },
  { bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-200 dark:border-purple-800', dot: 'bg-purple-400' },
  { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800', dot: 'bg-amber-400' },
  { bg: 'bg-pink-50 dark:bg-pink-950/30', border: 'border-pink-200 dark:border-pink-800', dot: 'bg-pink-400' },
  { bg: 'bg-teal-50 dark:bg-teal-950/30', border: 'border-teal-200 dark:border-teal-800', dot: 'bg-teal-400' },
];

function getNoteColor(idx) {
  return NOTE_COLORS[idx % NOTE_COLORS.length];
}

function stripHtml(html = '') {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

export default function WorkspaceNotes({ notes, workspaceId, onUpdate, showCreateButton = true }) {
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // grid | list

  const handleCreateNote = async () => {
    if (!workspaceId) { toast.error('Workspace ID tidak ditemukan'); return; }
    setIsCreating(true);
    try {
      const newNote = await Note.create({ title: 'Catatan Baru', content: '', workspace_id: workspaceId });
      toast.success('Catatan baru dibuat');
      window.dispatchEvent(new CustomEvent('noteCreated', { detail: { workspaceId, noteId: newNote.id } }));
      window.location.href = createPageUrl(`NoteEditor?id=${newNote.id}`);
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Gagal membuat catatan baru');
    } finally {
      setIsCreating(false);
    }
  };

  const handleNoteClick = (noteId) => {
    window.location.href = createPageUrl(`NoteEditor?id=${noteId}`);
  };

  const filteredNotes = (notes || []).filter(n =>
    n.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    stripHtml(n.content).toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Separate pinned and regular notes
  const pinnedNotes = filteredNotes.filter(n => n.pinned);
  const regularNotes = filteredNotes.filter(n => !n.pinned);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-500" />
            Catatan Workspace
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{(notes || []).length} catatan tersimpan</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            >
              ▦ Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1.5 text-xs font-medium border-l border-gray-200 dark:border-gray-700 transition-colors ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            >
              ☰ List
            </button>
          </div>
          {showCreateButton && (
            <Button onClick={handleCreateNote} disabled={isCreating} size="sm" className="bg-purple-600 hover:bg-purple-700 gap-2 shadow-sm">
              <Plus className="w-4 h-4" />
              {isCreating ? 'Membuat...' : 'Tambah Catatan'}
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      {(notes || []).length > 3 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Cari catatan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      )}

      {/* Notes Display */}
      {filteredNotes.length > 0 ? (
        <div className="space-y-4">
          {/* Pinned Notes */}
          {pinnedNotes.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Pin className="w-3 h-3" /> Disematkan
              </p>
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3' : 'space-y-2'}>
                {pinnedNotes.map((note, idx) => (
                  <NoteCard key={note.id} note={note} idx={idx} onClick={() => handleNoteClick(note.id)} viewMode={viewMode} />
                ))}
              </div>
            </div>
          )}

          {/* Regular Notes */}
          {regularNotes.length > 0 && (
            <div>
              {pinnedNotes.length > 0 && (
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Catatan Lainnya</p>
              )}
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3' : 'space-y-2'}>
                {regularNotes.map((note, idx) => (
                  <NoteCard key={note.id} note={note} idx={idx + pinnedNotes.length} onClick={() => handleNoteClick(note.id)} viewMode={viewMode} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <Card className="border-dashed border-2 dark:border-gray-700">
          <CardContent className="text-center py-14">
            <div className="w-16 h-16 bg-purple-50 dark:bg-purple-950/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
              {searchQuery ? 'Catatan tidak ditemukan' : 'Belum ada catatan'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              {searchQuery ? 'Coba kata kunci pencarian yang berbeda' : 'Mulai buat catatan pertama di workspace ini'}
            </p>
            {showCreateButton && !searchQuery && (
              <Button onClick={handleCreateNote} disabled={isCreating} size="sm" className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" /> Buat Catatan Pertama
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function NoteCard({ note, idx, onClick, viewMode }) {
  const colorStyle = getNoteColor(idx);
  const previewText = stripHtml(note.content || '');
  const wordCount = previewText.split(/\s+/).filter(Boolean).length;

  if (viewMode === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all hover:shadow-sm ${colorStyle.bg} ${colorStyle.border}`}
        onClick={onClick}
      >
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colorStyle.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {note.pinned && <Pin className="w-3 h-3 text-amber-500 flex-shrink-0" />}
            <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{note.title}</p>
          </div>
          {previewText && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{previewText}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 text-xs text-gray-400">
          {note.tags && note.tags.length > 0 && (
            <Badge variant="outline" className="text-xs">{note.tags[0]}</Badge>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {note.created_date ? format(new Date(note.created_date), 'dd MMM', { locale: id }) : ''}
          </span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 group ${colorStyle.bg} ${colorStyle.border}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2 gap-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {note.pinned && <Pin className="w-3 h-3 text-amber-500 flex-shrink-0" />}
          <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{note.title}</h3>
        </div>
        {note.archived && <Badge variant="secondary" className="text-xs flex-shrink-0">Arsip</Badge>}
      </div>

      {previewText && (
        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3 leading-relaxed mb-3">{previewText}</p>
      )}

      {/* Tags */}
      {note.tags && note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {note.tags.slice(0, 2).map(tag => (
            <span key={tag} className="flex items-center gap-0.5 text-[10px] bg-white/60 dark:bg-gray-800/60 px-1.5 py-0.5 rounded-full text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
              <Tag className="w-2 h-2" />{tag}
            </span>
          ))}
          {note.tags.length > 2 && (
            <span className="text-[10px] text-gray-400">+{note.tags.length - 2}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500 mt-auto pt-1 border-t border-gray-100 dark:border-gray-700/50">
        <span className="flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" />
          {note.created_date ? format(new Date(note.created_date), 'dd MMM yyyy', { locale: id }) : ''}
        </span>
        {wordCount > 0 && <span>{wordCount} kata</span>}
      </div>
    </motion.div>
  );
}