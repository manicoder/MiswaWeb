import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { getCatalogs, createCatalog, updateCatalog, deleteCatalog } from '../../utils/api';
import { toast } from 'sonner';

const CatalogsManagement: React.FC = () => {
  const [catalogs, setCatalogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showDialog, setShowDialog] = useState<boolean>(false);
  const [editingCatalog, setEditingCatalog] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    pdf_url: '',
    image_url: '',
  });

  useEffect(() => {
    fetchCatalogs();
  }, []);

  const fetchCatalogs = async () => {
    try {
      const response = await getCatalogs();
      setCatalogs(response.data);
    } catch (error) {
      toast.error('Failed to fetch catalogs');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      if (editingCatalog) {
        await updateCatalog(editingCatalog.id, formData);
        toast.success('Catalog updated successfully');
      } else {
        await createCatalog(formData);
        toast.success('Catalog created successfully');
      }
      setShowDialog(false);
      setEditingCatalog(null);
      setFormData({ title: '', description: '', category: '', pdf_url: '', image_url: '' });
      fetchCatalogs();
    } catch (error) {
      toast.error('Failed to save catalog');
    }
  };

  const handleEdit = (catalog: any) => {
    setEditingCatalog(catalog);
    setFormData({
      title: catalog.title,
      description: catalog.description,
      category: catalog.category,
      pdf_url: catalog.pdf_url || '',
      image_url: catalog.image_url || '',
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this catalog?')) return;
    try {
      await deleteCatalog(id);
      toast.success('Catalog deleted successfully');
      fetchCatalogs();
    } catch (error) {
      toast.error('Failed to delete catalog');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Catalogs Management</h1>
        <Button
          onClick={() => {
            setEditingCatalog(null);
            setFormData({ title: '', description: '', category: '', pdf_url: '', image_url: '' });
            setShowDialog(true);
          }}
          className="bg-coral-500 hover:bg-coral-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Catalog
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-12 h-12 border-4 border-coral-200 border-t-coral-500 rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {catalogs.map((catalog) => (
                <TableRow key={catalog.id}>
                  <TableCell>{catalog.title}</TableCell>
                  <TableCell><span className="capitalize">{catalog.category}</span></TableCell>
                  <TableCell className="max-w-xs truncate">{catalog.description}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(catalog)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(catalog.id)} className="text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingCatalog ? 'Edit Catalog' : 'Add New Catalog'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
            </div>
            <div>
              <Label>Category *</Label>
              <Input required value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} placeholder="e.g., Educational Toys, Kids Wear" />
            </div>
            <div>
              <Label>Description *</Label>
              <Textarea required rows={4} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            </div>
            <div>
              <Label>PDF URL (Optional)</Label>
              <Input type="url" value={formData.pdf_url} onChange={(e) => setFormData({ ...formData, pdf_url: e.target.value })} />
            </div>
            <div>
              <Label>Image URL (Optional)</Label>
              <Input type="url" value={formData.image_url} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button type="submit" className="bg-coral-500 hover:bg-coral-600">Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CatalogsManagement;