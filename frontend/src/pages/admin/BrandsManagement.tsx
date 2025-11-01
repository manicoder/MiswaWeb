import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { getBrands, createBrand, updateBrand, deleteBrand } from '../../utils/api';
import { toast } from 'sonner';

const BrandsManagement: React.FC = () => {
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showDialog, setShowDialog] = useState<boolean>(false);
  const [editingBrand, setEditingBrand] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    tagline: '',
    description: '',
    website: '',
    logo_url: '',
    image_url: '',
  });

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      const response = await getBrands();
      setBrands(response.data);
    } catch (error) {
      toast.error('Failed to fetch brands');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      if (editingBrand) {
        await updateBrand(editingBrand.id, formData);
        toast.success('Brand updated successfully');
      } else {
        await createBrand(formData);
        toast.success('Brand created successfully');
      }
      setShowDialog(false);
      setEditingBrand(null);
      setFormData({ name: '', tagline: '', description: '', website: '', logo_url: '', image_url: '' });
      fetchBrands();
    } catch (error) {
      toast.error('Failed to save brand');
    }
  };

  const handleEdit = (brand: any) => {
    setEditingBrand(brand);
    setFormData({
      name: brand.name,
      tagline: brand.tagline,
      description: brand.description,
      website: brand.website,
      logo_url: brand.logo_url,
      image_url: brand.image_url || '',
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this brand?')) return;
    try {
      await deleteBrand(id);
      toast.success('Brand deleted successfully');
      fetchBrands();
    } catch (error) {
      toast.error('Failed to delete brand');
    }
  };

  return (
    <div data-testid="brands-management">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Brands Management</h1>
        <Button
          onClick={() => {
            setEditingBrand(null);
            setFormData({ name: '', tagline: '', description: '', website: '', logo_url: '', image_url: '' });
            setShowDialog(true);
          }}
          className="bg-coral-500 hover:bg-coral-600"
          data-testid="add-brand-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Brand
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
                <TableHead>Logo</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Tagline</TableHead>
                <TableHead>Website</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {brands.map((brand) => (
                <TableRow key={brand.id}>
                  <TableCell>
                    <img src={brand.logo_url} alt={brand.name} className="h-12 w-auto" />
                  </TableCell>
                  <TableCell>{brand.name}</TableCell>
                  <TableCell>{brand.tagline}</TableCell>
                  <TableCell>
                    <a href={brand.website} target="_blank" rel="noopener noreferrer" className="text-coral-500 hover:underline">
                      {brand.website}
                    </a>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(brand)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(brand.id)} className="text-red-600">
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
            <DialogTitle>{editingBrand ? 'Edit Brand' : 'Add New Brand'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div>
              <Label>Tagline *</Label>
              <Input required value={formData.tagline} onChange={(e) => setFormData({ ...formData, tagline: e.target.value })} />
            </div>
            <div>
              <Label>Description *</Label>
              <Textarea required rows={4} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            </div>
            <div>
              <Label>Website URL *</Label>
              <Input required type="url" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} />
            </div>
            <div>
              <Label>Logo URL *</Label>
              <Input required type="url" value={formData.logo_url} onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })} />
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

export default BrandsManagement;