import React, { useState } from 'react';
import { Lightbulb, Bell, Tag, Archive, Trash2, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

export default function NoteSidebar({ labels, activeView, onViewChange, activeLabel, onLabelChange, onClose, isMobile }) {
  const navItems = [
    { id: 'notes', icon: Lightbulb, name: 'Catatan' },
    { id: 'reminders', icon: Bell, name: 'Pengingat' }
  ];

  const bottomNavItems = [
    { id: 'archive', icon: Archive, name: 'Arsipkan' },
    { id: 'trash', icon: Trash2, name: 'Sampah' }
  ];

  const handleNavClick = (viewId) => {
    onViewChange(viewId);
    onLabelChange(null);
    if (onClose && isMobile) {
      onClose();
    }
  };

  const handleLabelClick = (labelId) => {
    onViewChange('notes');
    onLabelChange(labelId);
    if (onClose && isMobile) {
      onClose();
    }
  };

  return (
    <aside className="bg-slate-900 dark:bg-gray-800/50 flex flex-col border-r border-gray-200 dark:border-gray-700 h-full w-64 relative">
      {/* Close button for desktop */}
      {!isMobile && (
        <div className="absolute top-2 right-2 z-10">
          <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-300 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </Button>
        </div>
      )}

      <div className="p-2 flex-1 overflow-y-auto">
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <Button
              key={item.id}
              variant={activeView === item.id && !activeLabel ? 'secondary' : 'ghost'}
              className="w-full justify-start gap-4 px-4 text-gray-300 hover:text-white hover:bg-slate-800"
              onClick={() => handleNavClick(item.id)}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </Button>
          ))}

          {labels.map((label) => (
            <Button
              key={label.id}
              variant={activeLabel === label.id ? 'secondary' : 'ghost'}
              className="w-full justify-start gap-4 px-4 text-gray-300 hover:text-white hover:bg-slate-800"
              onClick={() => handleLabelClick(label.id)}
            >
              <Tag className="w-5 h-5" />
              <span className="truncate flex-1 text-left">{label.name}</span>
            </Button>
          ))}
          
          <Button
            variant="ghost"
            className="w-full justify-start gap-4 px-4 text-gray-300 hover:text-white hover:bg-slate-800"
          >
            <Pencil className="w-5 h-5" />
            <span className="font-medium">Edit label</span>
          </Button>
          
          <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
            {bottomNavItems.map((item) => (
              <Button
                key={item.id}
                variant={activeView === item.id ? 'secondary' : 'ghost'}
                className="w-full justify-start gap-4 px-4 text-gray-300 hover:text-white hover:bg-slate-800"
                onClick={() => handleNavClick(item.id)}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Button>
            ))}
          </div>
        </nav>
      </div>
      <div className="p-4 text-xs text-gray-500 dark:text-gray-400">
        Lisensi open source
      </div>
    </aside>
  );
}