import NoteItem from './NoteItem';
import { AnimatePresence } from 'framer-motion';

export default function NoteList({ notes, workspaces, onEdit, onDelete, isLoading }) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 h-32 rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-6xl mb-4">📝</div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          Belum ada catatan
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Buat catatan pertama Anda untuk memulai!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {notes.map(note => (
          <NoteItem
            key={note.id}
            note={note}
            workspaces={workspaces}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}