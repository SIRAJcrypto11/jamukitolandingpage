import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Filter, X } from 'lucide-react';

export default function NoteFilters({ filters, onFilterChange, workspaces }) {
  const hasActiveFilters = Object.values(filters).some(value => value !== 'all');

  const clearFilters = () => {
    onFilterChange({
      workspace: 'all',
      is_template: 'all'
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter:</span>
      </div>
      
      <Select value={filters.workspace} onValueChange={(value) => onFilterChange({...filters, workspace: value})}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Workspace" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Workspace</SelectItem>
          {workspaces.map(workspace => (
            <SelectItem key={workspace.id} value={workspace.id}>
              {workspace.icon} {workspace.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.is_template} onValueChange={(value) => onFilterChange({...filters, is_template: value})}>
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Tipe" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Tipe</SelectItem>
          <SelectItem value="false">Catatan</SelectItem>
          <SelectItem value="true">Template</SelectItem>
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500 hover:text-gray-700">
          <X className="w-4 h-4 mr-1" />
          Hapus Filter
        </Button>
      )}
    </div>
  );
}