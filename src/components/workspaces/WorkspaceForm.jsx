import React, { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

const colors = [
  '#1f2937', '#3b82f6', '#8b5cf6', '#10b981', 
  '#ef4444', '#06b6d4', '#84cc16', '#f97316'
];

const icons = ['🏠', '💼', '🚀', '📈', '🎯', '💡', '🔥', '⚡'];

export default function WorkspaceForm({ workspace, onSubmit, onCancel }) {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '🏠',
    color: '#3b82f6',
    is_personal: false,
    settings: {
      allow_public_sharing: false,
      default_task_priority: 'medium'
    }
  });

  useEffect(() => {
    loadUser();
    if (workspace) {
      setFormData({
        name: workspace.name || '',
        description: workspace.description || '',
        icon: workspace.icon || '🏠',
        color: workspace.color || '#3b82f6',
        is_personal: workspace.is_personal || false,
        settings: workspace.settings || { allow_public_sharing: false, default_task_priority: 'medium' }
      });
    } else {
      setFormData({
        name: '',
        description: '',
        icon: '🏠',
        color: '#3b82f6',
        is_personal: false,
        settings: {
          allow_public_sharing: false,
          default_task_priority: 'medium'
        }
      });
    }
  }, [workspace]);

  const loadUser = async () => {
    try {
      const userData = await User.me();
      setUser(userData);
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      owner_id: user?.email || ''
    };
    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="pt-4 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nama Workspace</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
          placeholder="cth. Proyek Klien X"
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="description">Deskripsi</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
          placeholder="Deskripsi singkat tentang workspace ini"
        />
      </div>

      <div className="space-y-2">
        <Label>Icon</Label>
        <div className="flex flex-wrap gap-2">
          {icons.map(icon => (
            <button
              key={icon}
              type="button"
              className={`p-2 text-xl border rounded-lg transition-all ${formData.icon === icon ? 'border-blue-500 bg-blue-50 dark:bg-blue-900 ring-2 ring-blue-500' : 'border-gray-300 dark:border-gray-600'}`}
              onClick={() => setFormData(prev => ({...prev, icon}))}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Warna</Label>
        <div className="flex flex-wrap gap-2">
          {colors.map(color => (
            <button
              key={color}
              type="button"
              className={`w-8 h-8 rounded-lg border-2 transition-all ${formData.color === color ? 'border-gray-900 dark:border-gray-100 ring-2 ring-offset-2 ring-blue-500' : 'border-gray-300 dark:border-gray-600'}`}
              style={{ backgroundColor: color }}
              onClick={() => setFormData(prev => ({...prev, color}))}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center space-x-2 pt-2">
        <Switch
          id="is_personal"
          checked={formData.is_personal}
          onCheckedChange={(checked) => setFormData(prev => ({...prev, is_personal: checked}))}
        />
        <Label htmlFor="is_personal">Jadikan Workspace Pribadi</Label>
      </div>
      
      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit">
          {workspace ? 'Update' : 'Buat'} Workspace
        </Button>
      </div>
    </form>
  );
}