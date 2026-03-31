import { memo } from 'react';
import NoteItem from './NoteItem';

const NoteMasonryGrid = memo(({ notes, labels, onNoteSelect, onPinToggle, onArchiveToggle, onDelete, onAddLabel, onRemoveLabel }) => {
  if (notes.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <p>Tidak ada catatan untuk ditampilkan.</p>
      </div>
    );
  }

  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5 gap-4">
      {notes.map((note) => (
        <div key={note.id} className="break-inside-avoid mb-4">
          <NoteItem
            note={note}
            labels={labels}
            onSelect={onNoteSelect}
            onPinToggle={onPinToggle}
            onArchiveToggle={onArchiveToggle}
            onDelete={onDelete}
            onAddLabel={onAddLabel}
            onRemoveLabel={onRemoveLabel}
          />
        </div>
      ))}
    </div>
  );
});

NoteMasonryGrid.displayName = 'NoteMasonryGrid';

export default NoteMasonryGrid;