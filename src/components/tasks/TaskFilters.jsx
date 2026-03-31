import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Filter, X } from 'lucide-react';

export default function TaskFilters({ filters = {}, onFilterChange, workspaces = [] }) {
  // Ensure filters object has default values
  const currentFilters = {
    status: 'all',
    priority: 'all',
    workspace: 'all',
    assignee: 'all',
    ...filters
  };

  const hasActiveFilters = Object.values(currentFilters).some(value => value !== 'all');

  const clearFilters = () => {
    if (onFilterChange) {
      onFilterChange({
        status: 'all',
        priority: 'all',
        workspace: 'all',
        assignee: 'all'
      });
    }
  };

  const handleFilterChange = (key, value) => {
    if (onFilterChange) {
      onFilterChange({
        ...currentFilters,
        [key]: value
      });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter:</span>
      </div>
      
      <Select value={currentFilters.status} onValueChange={(value) => handleFilterChange('status', value)}>
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Status</SelectItem>
          <SelectItem value="todo">Belum Mulai</SelectItem>
          <SelectItem value="in_progress">Sedang Dikerjakan</SelectItem>
          <SelectItem value="review">Review</SelectItem>
          <SelectItem value="done">Selesai</SelectItem>
          <SelectItem value="cancelled">Dibatalkan</SelectItem>
        </SelectContent>
      </Select>

      <Select value={currentFilters.priority} onValueChange={(value) => handleFilterChange('priority', value)}>
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Prioritas" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Prioritas</SelectItem>
          <SelectItem value="low">Rendah</SelectItem>
          <SelectItem value="medium">Sedang</SelectItem>
          <SelectItem value="high">Tinggi</SelectItem>
          <SelectItem value="urgent">Mendesak</SelectItem>
        </SelectContent>
      </Select>

      <Select value={currentFilters.workspace} onValueChange={(value) => handleFilterChange('workspace', value)}>
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

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500 hover:text-gray-700">
          <X className="w-4 h-4 mr-1" />
          Hapus Filter
        </Button>
      )}
    </div>
  );
}