import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Sparkles, Eye, Save, Loader2, Plus, Edit, Trash2, 
  Newspaper, FileText, Image, Tag, Calendar, Send
} from 'lucide-react';
import { toast } from 'sonner';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export default function BlogContentTab() {
  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showArticleDialog, setShowArticleDialog] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiTheme, setAiTheme] = useState('');

  const [articleForm, setArticleForm] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    category: 'Bisnis',
    author: 'SNISHOP Team',
    cover_image: '',
    featured: false,
    read_time: 5,
    tags: [],
    published: false,
    seo_title: '',
    seo_description: ''
  });

  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    try {
      setIsLoading(true);
      const data = await base44.entities.BlogContent.list('-created_date');
      setArticles(data || []);
    } catch (error) {
      toast.error('Gagal memuat artikel');
    } finally {
      setIsLoading(false);
    }
  };

  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  const handleGenerateWithAI = async () => {
    if (!aiTheme.trim()) {
      toast.error('Masukkan tema artikel');
      return;
    }

    try {
      setIsGenerating(true);
      
      const schema = {
        type: "object",
        properties: {
          title: { type: "string" },
          excerpt: { type: "string" },
          content: { type: "string" },
          category: { 
            type: "string",
            enum: ["Bisnis", "Teknologi", "Tips & Trik", "Case Study", "Product Update", "Tutorial"]
          },
          tags: { type: "array", items: { type: "string" } },
          seo_title: { type: "string" },
          seo_description: { type: "string" }
        }
      };

      const prompt = `
        Generate artikel blog professional dalam Bahasa Indonesia untuk SNISHOP dengan tema:
        "${aiTheme}"

        INSTRUKSI:
        - Title: Menarik, SEO-friendly, maksimal 60 karakter
        - Excerpt: Ringkasan menarik 150-200 karakter
        - Content: Artikel lengkap 500-800 kata dalam format HTML
          * Gunakan tag <h2>, <h3>, <p>, <ul>, <li>, <strong>
          * Struktur: intro, 3-5 poin utama, conclusion
          * Tone: Professional namun friendly
          * Sertakan contoh praktis dan actionable tips
        - Category: Pilih yang paling sesuai
        - Tags: 3-5 tags relevan
        - SEO Title: Optimal untuk search engine
        - SEO Description: Meta description 150-160 karakter

        Tema: ${aiTheme}
      `;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: schema
      });

      const generatedArticle = {
        ...result,
        slug: generateSlug(result.title),
        author: 'SNISHOP Team',
        read_time: Math.ceil(result.content.split(' ').length / 200),
        featured: false,
        published: false,
        cover_image: ''
      };

      setArticleForm(generatedArticle);
      setShowArticleDialog(true);
      toast.success('✅ Artikel berhasil di-generate! Silakan review dan edit jika perlu.');
      setAiTheme('');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Gagal generate artikel');
    } finally {
      setIsGenerating(false);
    }
  };

  const openAddArticleDialog = () => {
    setEditingArticle(null);
    setArticleForm({
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      category: 'Bisnis',
      author: 'SNISHOP Team',
      cover_image: '',
      featured: false,
      read_time: 5,
      tags: [],
      published: false,
      seo_title: '',
      seo_description: ''
    });
    setTagInput('');
    setShowArticleDialog(true);
  };

  const openEditArticleDialog = (article) => {
    setEditingArticle(article);
    setArticleForm(article);
    setTagInput('');
    setShowArticleDialog(true);
  };

  const saveArticle = async () => {
    if (!articleForm.title || !articleForm.content) {
      toast.error('Title dan Content wajib diisi!');
      return;
    }

    try {
      const articleData = {
        ...articleForm,
        slug: articleForm.slug || generateSlug(articleForm.title),
        published_date: articleForm.published ? new Date().toISOString() : null
      };

      if (editingArticle) {
        await base44.entities.BlogContent.update(editingArticle.id, articleData);
        toast.success('✅ Artikel berhasil diupdate!');
      } else {
        await base44.entities.BlogContent.create(articleData);
        toast.success('✅ Artikel baru berhasil ditambahkan!');
      }

      loadArticles();
      setShowArticleDialog(false);
    } catch (error) {
      toast.error('Gagal menyimpan artikel');
    }
  };

  const deleteArticle = async (id) => {
    if (!confirm('Yakin ingin hapus artikel ini?')) return;
    
    try {
      await base44.entities.BlogContent.delete(id);
      toast.success('✅ Artikel berhasil dihapus!');
      loadArticles();
    } catch (error) {
      toast.error('Gagal hapus artikel');
    }
  };

  const addTag = () => {
    if (!tagInput.trim()) return;
    if (articleForm.tags.includes(tagInput.trim())) {
      toast.error('Tag sudah ada');
      return;
    }
    setArticleForm({
      ...articleForm,
      tags: [...articleForm.tags, tagInput.trim()]
    });
    setTagInput('');
  };

  const removeTag = (index) => {
    setArticleForm({
      ...articleForm,
      tags: articleForm.tags.filter((_, i) => i !== index)
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Newspaper className="w-6 h-6 text-orange-500" />
            Kelola Artikel Blog
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            {articles.length} total artikel
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => window.open('/bloglist', '_blank')}
            variant="outline"
            className="border-gray-700"
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button
            onClick={openAddArticleDialog}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambah Manual
          </Button>
        </div>
      </div>

      {/* AI Generator */}
      <Card className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 border-purple-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            Generate Artikel dengan AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={aiTheme}
            onChange={(e) => setAiTheme(e.target.value)}
            placeholder="Contoh: 10 Tips Meningkatkan Penjualan untuk UKM Indonesia"
            className="bg-gray-800 border-gray-700 text-white"
          />
          <Button
            onClick={handleGenerateWithAI}
            disabled={isGenerating}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            Generate Artikel
          </Button>
        </CardContent>
      </Card>

      {/* Articles List */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Daftar Artikel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {articles.length > 0 ? (
            articles.map((article) => (
              <Card key={article.id} className="bg-gray-800 border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-lg font-bold text-white">{article.title}</h4>
                        {article.featured && <Badge className="bg-yellow-600">Featured</Badge>}
                        {article.published ? 
                          <Badge className="bg-green-600">Published</Badge> : 
                          <Badge className="bg-gray-600">Draft</Badge>
                        }
                      </div>
                      <p className="text-gray-400 text-sm mb-3">{article.excerpt}</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="border-orange-600 text-orange-400">
                          {article.category}
                        </Badge>
                        <Badge variant="outline" className="border-gray-600 text-gray-400">
                          {article.read_time} min read
                        </Badge>
                        <Badge variant="outline" className="border-gray-600 text-gray-400">
                          {article.views || 0} views
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditArticleDialog(article)}
                        className="border-blue-600 text-blue-400"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteArticle(article.id)}
                        className="border-red-600 text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-8">
              <Newspaper className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 mb-4">Belum ada artikel</p>
              <Button onClick={openAddArticleDialog} className="bg-orange-600">
                <Plus className="w-4 h-4 mr-2" />
                Buat Artikel Pertama
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Article Dialog */}
      <Dialog open={showArticleDialog} onOpenChange={setShowArticleDialog}>
        <DialogContent className="bg-gray-900 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingArticle ? 'Edit Artikel' : 'Tambah Artikel Baru'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">Judul Artikel *</Label>
              <Input
                value={articleForm.title}
                onChange={(e) => {
                  const newTitle = e.target.value;
                  setArticleForm({ 
                    ...articleForm, 
                    title: newTitle,
                    slug: generateSlug(newTitle)
                  });
                }}
                placeholder="10 Tips Meningkatkan Penjualan untuk UKM"
                className="bg-gray-800 border-gray-700 text-white mt-2"
              />
            </div>

            <div>
              <Label className="text-gray-300">Slug (URL)</Label>
              <Input
                value={articleForm.slug}
                onChange={(e) => setArticleForm({ ...articleForm, slug: e.target.value })}
                className="bg-gray-800 border-gray-700 text-white mt-2"
              />
            </div>

            <div>
              <Label className="text-gray-300">Excerpt (Ringkasan) *</Label>
              <Textarea
                value={articleForm.excerpt}
                onChange={(e) => setArticleForm({ ...articleForm, excerpt: e.target.value })}
                placeholder="Ringkasan singkat artikel..."
                className="bg-gray-800 border-gray-700 text-white mt-2"
              />
            </div>

            <div>
              <Label className="text-gray-300">Konten Artikel (HTML) *</Label>
              <div className="mt-2 bg-white rounded">
                <ReactQuill
                  value={articleForm.content}
                  onChange={(value) => setArticleForm({ ...articleForm, content: value })}
                  theme="snow"
                  className="text-gray-900"
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      ['link', 'image'],
                      ['clean']
                    ]
                  }}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Category</Label>
                <select
                  value={articleForm.category}
                  onChange={(e) => setArticleForm({ ...articleForm, category: e.target.value })}
                  className="w-full mt-2 px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
                >
                  <option value="Bisnis">Bisnis</option>
                  <option value="Teknologi">Teknologi</option>
                  <option value="Tips & Trik">Tips & Trik</option>
                  <option value="Case Study">Case Study</option>
                  <option value="Product Update">Product Update</option>
                  <option value="Tutorial">Tutorial</option>
                </select>
              </div>

              <div>
                <Label className="text-gray-300">Read Time (menit)</Label>
                <Input
                  type="number"
                  value={articleForm.read_time}
                  onChange={(e) => setArticleForm({ ...articleForm, read_time: parseInt(e.target.value) })}
                  className="bg-gray-800 border-gray-700 text-white mt-2"
                />
              </div>
            </div>

            <div>
              <Label className="text-gray-300">Cover Image URL (Optional)</Label>
              <Input
                value={articleForm.cover_image}
                onChange={(e) => setArticleForm({ ...articleForm, cover_image: e.target.value })}
                placeholder="https://images.unsplash.com/..."
                className="bg-gray-800 border-gray-700 text-white mt-2"
              />
            </div>

            <div>
              <Label className="text-gray-300">Tags</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                  placeholder="productivity, ukm, digital"
                  className="bg-gray-800 border-gray-700 text-white flex-1"
                />
                <Button onClick={addTag} variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {articleForm.tags.map((tag, idx) => (
                  <Badge key={idx} className="bg-orange-600">
                    {tag}
                    <button onClick={() => removeTag(idx)} className="ml-2 hover:text-red-400">×</button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={articleForm.featured}
                  onChange={(e) => setArticleForm({ ...articleForm, featured: e.target.checked })}
                  className="w-4 h-4"
                />
                <span>Featured Article</span>
              </label>
              <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={articleForm.published}
                  onChange={(e) => setArticleForm({ ...articleForm, published: e.target.checked })}
                  className="w-4 h-4"
                />
                <span>Publish Article</span>
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowArticleDialog(false)}
                className="flex-1"
              >
                Batal
              </Button>
              <Button
                onClick={saveArticle}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {editingArticle ? 'Update Artikel' : 'Tambah Artikel'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}