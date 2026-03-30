import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Tag } from 'lucide-react';

export default function LabelDialog({ open, onOpenChange, note, labels, onAddLabel, onRemoveLabel }) {
  if (!note) return null;

  const noteLabels = Array.isArray(note.labels) ? note.labels : [];

  const handleLabelToggle = (labelId) => {
    if (noteLabels.includes(labelId)) {
      onRemoveLabel(note.id, labelId);
    } else {
      onAddLabel(note.id, labelId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Kelola Label
          </DialogTitle>
          <DialogDescription>
            Pilih label untuk catatan "{note.title}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {labels.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Tag className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Belum ada label</p>
              <p className="text-sm">Buat label baru di menu "Edit label"</p>
            </div>
          ) : (
            labels.map((label) => {
              const isSelected = noteLabels.includes(label.id);
              return (
                <Button
                  key={label.id}
                  variant={isSelected ? "secondary" : "outline"}
                  className="w-full justify-start"
                  onClick={() => handleLabelToggle(label.id)}
                >
                  <div className="flex items-center gap-2 flex-1">
                    <Badge
                      variant="secondary"
                      style={{ backgroundColor: label.color || '#9CA3AF', color: '#fff' }}
                      className="text-xs"
                    >
                      {label.icon} {label.name}
                    </Badge>
                  </div>
                  {isSelected && <Check className="w-4 h-4 ml-auto" />}
                </Button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}