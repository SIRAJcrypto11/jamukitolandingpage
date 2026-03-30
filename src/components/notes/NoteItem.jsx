import React, { memo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pin, Archive, Trash2, Tag, MoreVertical } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import LabelDialog from './LabelDialog';

const NoteItem = memo(({ note, labels, onSelect, onPinToggle, onArchiveToggle, onDelete, onAddLabel, onRemoveLabel }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLabelDialog, setShowLabelDialog] = useState(false);

  const handleMenuAction = (e, action) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    action();
  };

  const getFormattedDate = () => {
    try {
      if (!note.updated_date) return 'Baru saja';
      const date = new Date(note.updated_date);
      if (isNaN(date.getTime())) return 'Baru saja';
      return formatDistanceToNow(date, { addSuffix: true, locale: id });
    } catch (error) {
      return 'Baru saja';
    }
  };

  const noteLabels = Array.isArray(note.labels) ? note.labels : [];
  const noteLabelObjects = labels.filter(l => noteLabels.includes(l.id));

  return (
    <>
      <Card 
        onClick={() => onSelect(note)} 
        className="cursor-pointer transition-shadow hover:shadow-lg bg-gray-800 text-white border-gray-700 relative"
      >
        <CardContent className="p-4">
          <div className="absolute top-2 right-2 flex items-center gap-1">
            {note.pinned && <Pin className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
            <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-gray-700"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={(e) => handleMenuAction(e, () => onPinToggle?.(note.id, !note.pinned))}>
                  <Pin className="w-4 h-4 mr-2" />
                  {note.pinned ? 'Lepas Pin' : 'Pin Catatan'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => handleMenuAction(e, () => onArchiveToggle?.(note.id, !note.archived))}>
                  <Archive className="w-4 h-4 mr-2" />
                  {note.archived ? 'Pulihkan' : 'Arsipkan'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(false);
                  setShowLabelDialog(true);
                }}>
                  <Tag className="w-4 h-4 mr-2" />
                  Kelola Label
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={(e) => handleMenuAction(e, () => onDelete?.(note.id))}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Hapus
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <h3 className="font-semibold mb-2 truncate pr-10">{note.title}</h3>
          <div 
            className="text-sm text-gray-300 overflow-hidden max-h-24 note-content-preview line-clamp-3"
            dangerouslySetInnerHTML={{ __html: note.content || '' }} 
          />
          
          {noteLabelObjects.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {noteLabelObjects.map((label) => (
                <Badge 
                  key={label.id} 
                  variant="secondary" 
                  className="text-xs"
                  style={{ backgroundColor: label.color || '#9CA3AF', color: '#fff' }}
                >
                  {label.icon} {label.name}
                </Badge>
              ))}
            </div>
          )}
          
          <p className="text-xs text-gray-500 mt-4">
            {getFormattedDate()}
          </p>
        </CardContent>
      </Card>

      <LabelDialog
        open={showLabelDialog}
        onOpenChange={setShowLabelDialog}
        note={note}
        labels={labels}
        onAddLabel={onAddLabel}
        onRemoveLabel={onRemoveLabel}
      />
    </>
  );
});

NoteItem.displayName = 'NoteItem';

export default NoteItem;