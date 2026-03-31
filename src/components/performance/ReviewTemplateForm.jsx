import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ReviewTemplateForm({ companyId, onClose, onSuccess }) {
  const [template, setTemplate] = useState({
    name: '',
    competencies: [
      'Communication',
      'Teamwork',
      'Problem Solving',
      'Initiative',
      'Quality of Work'
    ]
  });

  const addCompetency = () => {
    setTemplate({
      ...template,
      competencies: [...template.competencies, '']
    });
  };

  const removeCompetency = (index) => {
    setTemplate({
      ...template,
      competencies: template.competencies.filter((_, i) => i !== index)
    });
  };

  const updateCompetency = (index, value) => {
    const updated = [...template.competencies];
    updated[index] = value;
    setTemplate({ ...template, competencies: updated });
  };

  const handleSave = () => {
    if (!template.name) {
      toast.error('Template name required');
      return;
    }

    // Save to localStorage for now
    const templates = JSON.parse(localStorage.getItem('review_templates') || '[]');
    templates.push({ ...template, id: Date.now(), companyId });
    localStorage.setItem('review_templates', JSON.stringify(templates));

    toast.success('Template saved!');
    onSuccess();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">
            <FileText className="w-5 h-5 inline mr-2" />
            Create Review Template
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-gray-300">Template Name</Label>
            <Input
              value={template.name}
              onChange={(e) => setTemplate({...template, name: e.target.value})}
              className="bg-gray-800 border-gray-700 text-white mt-2"
              placeholder="e.g., Annual Review Template"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <Label className="text-white">Competencies to Assess</Label>
              <Button type="button" size="sm" onClick={addCompetency} className="bg-blue-600">
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>

            <div className="space-y-2">
              {template.competencies.map((comp, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    value={comp}
                    onChange={(e) => updateCompetency(idx, e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="Competency name"
                  />
                  {template.competencies.length > 1 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeCompetency(idx)}
                      className="text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-purple-600">
              Save Template
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}