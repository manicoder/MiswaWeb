import React, { useState, useEffect } from 'react';
import { Edit, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { getLinkPages, updateLinkPage, createLinkPage, type LinkPage } from '../../utils/api';
import { toast } from 'sonner';

const LinkPagesManagement: React.FC = () => {
  const [linkPages, setLinkPages] = useState<LinkPage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showDialog, setShowDialog] = useState<boolean>(false);
  const [editingPage, setEditingPage] = useState<LinkPage | null>(null);
  const [formData, setFormData] = useState({
    brand_slug: '',
    brand_name: '',
    tagline: '',
    description: '',
    logo_url: '',
    website_url: '',
    website_text: 'Visit',
    instagram_url: '',
    instagram_text: 'Visit',
    facebook_url: '',
    facebook_text: 'Visit',
    whatsapp_url: '',
    whatsapp_text: 'Visit',
    google_review_url: '',
    google_review_text: 'Visit',
    qr_codes: [] as Array<{ title: string; url: string }>,
    gradient_from: 'from-coral-400',
    gradient_to: 'to-orange-500',
    bg_gradient_from: 'from-orange-50',
    bg_gradient_via: 'via-white',
    bg_gradient_to: 'to-orange-50/30',
  });

  useEffect(() => {
    fetchLinkPages();
  }, []);

  const fetchLinkPages = async () => {
    try {
      const response = await getLinkPages();
      setLinkPages(response.data);
    } catch (error) {
      toast.error('Failed to fetch link pages');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    try {
      if (editingPage) {
        // Update existing page - exclude brand_slug from update payload
        const { brand_slug, ...updateData } = formData;
        await updateLinkPage(editingPage.brand_slug, updateData);
        toast.success('Link page updated successfully');
      } else {
        // Create new page
        if (!formData.brand_slug) {
          toast.error('Brand slug is required');
          return;
        }
        await createLinkPage(formData);
        toast.success('Link page created successfully');
      }
      setShowDialog(false);
      setEditingPage(null);
      setFormData({
        brand_slug: '',
        brand_name: '',
        tagline: '',
        description: '',
        logo_url: '',
        website_url: '',
        website_text: 'Visit',
        instagram_url: '',
        instagram_text: 'Visit',
        facebook_url: '',
        facebook_text: 'Visit',
        whatsapp_url: '',
        whatsapp_text: 'Visit',
        google_review_url: '',
        google_review_text: 'Visit',
        qr_codes: [],
        gradient_from: 'from-coral-400',
        gradient_to: 'to-orange-500',
        bg_gradient_from: 'from-orange-50',
        bg_gradient_via: 'via-white',
        bg_gradient_to: 'to-orange-50/30',
      });
      fetchLinkPages();
    } catch (error) {
      toast.error(editingPage ? 'Failed to update link page' : 'Failed to create link page');
    }
  };

  const handleEdit = (page: LinkPage) => {
    setEditingPage(page);
    setFormData({
      brand_slug: page.brand_slug || '',
      brand_name: page.brand_name || '',
      tagline: page.tagline || '',
      description: page.description || '',
      logo_url: page.logo_url || '',
      website_url: page.website_url || '',
      website_text: page.website_text || 'Visit',
      instagram_url: page.instagram_url || '',
      instagram_text: page.instagram_text || 'Visit',
      facebook_url: page.facebook_url || '',
      facebook_text: page.facebook_text || 'Visit',
      whatsapp_url: page.whatsapp_url || '',
      whatsapp_text: page.whatsapp_text || 'Visit',
      google_review_url: page.google_review_url || '',
      google_review_text: page.google_review_text || 'Visit',
      qr_codes: page.qr_codes || [],
      gradient_from: page.gradient_from || 'from-coral-400',
      gradient_to: page.gradient_to || 'to-orange-500',
      bg_gradient_from: page.bg_gradient_from || 'from-orange-50',
      bg_gradient_via: page.bg_gradient_via || 'via-white',
      bg_gradient_to: page.bg_gradient_to || 'to-orange-50/30',
    });
    setShowDialog(true);
  };

  const handleCreate = () => {
    setEditingPage(null);
    setFormData({
      brand_slug: '',
      brand_name: '',
      tagline: '',
      description: '',
      logo_url: '',
      website_url: '',
      website_text: 'Visit',
      instagram_url: '',
      instagram_text: 'Visit',
      facebook_url: '',
      facebook_text: 'Visit',
      whatsapp_url: '',
      whatsapp_text: 'Visit',
      google_review_url: '',
      google_review_text: 'Visit',
      qr_codes: [],
      gradient_from: 'from-coral-400',
      gradient_to: 'to-orange-500',
      bg_gradient_from: 'from-orange-50',
      bg_gradient_via: 'via-white',
      bg_gradient_to: 'to-orange-50/30',
    });
    setShowDialog(true);
  };

  const handlePreview = (brandSlug: string) => {
    window.open(`/${brandSlug}`, '_blank');
  };

  return (
    <div data-testid="link-pages-management">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Link Pages Management</h1>
          <p className="text-gray-600 mt-2">Manage social links and content for brand link pages</p>
        </div>
        <Button
          onClick={handleCreate}
          className="bg-coral-500 hover:bg-coral-600"
          data-testid="add-link-page-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add New Link Page
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
                <TableHead>Brand</TableHead>
                <TableHead>Tagline</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linkPages.map((page) => (
                <TableRow key={page.id || page.brand_slug}>
                  <TableCell>
                    <img src={page.logo_url} alt={page.brand_name} className="h-12 w-auto object-contain" />
                  </TableCell>
                  <TableCell className="font-semibold">{page.brand_name}</TableCell>
                  <TableCell className="max-w-xs truncate">{page.tagline}</TableCell>
                  <TableCell>
                    <code className="px-2 py-1 bg-gray-100 rounded text-sm">{page.brand_slug}</code>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handlePreview(page.brand_slug)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Preview
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(page)}>
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={(open) => {
        setShowDialog(open);
        if (!open) {
          setEditingPage(null);
          setFormData({
            brand_slug: '',
            brand_name: '',
            tagline: '',
            description: '',
            logo_url: '',
            website_url: '',
            website_text: 'Visit',
            instagram_url: '',
            instagram_text: 'Visit',
            facebook_url: '',
            facebook_text: 'Visit',
            whatsapp_url: '',
            whatsapp_text: 'Visit',
            google_review_url: '',
            google_review_text: 'Visit',
            qr_codes: [],
            gradient_from: 'from-coral-400',
            gradient_to: 'to-orange-500',
            bg_gradient_from: 'from-orange-50',
            bg_gradient_via: 'via-white',
            bg_gradient_to: 'to-orange-50/30',
          });
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPage ? `Edit Link Page: ${editingPage.brand_name}` : 'Create New Link Page'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!editingPage && (
              <div>
                <Label>Brand Slug * (URL-friendly, e.g., "newbrand")</Label>
                <Input 
                  required 
                  value={formData.brand_slug} 
                  onChange={(e) => setFormData({ ...formData, brand_slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })} 
                  placeholder="newbrand"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This will be used in the URL: /{formData.brand_slug || 'brandslug'}. Only lowercase letters, numbers, and hyphens.
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Brand Name *</Label>
                <Input 
                  required 
                  value={formData.brand_name} 
                  onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })} 
                />
              </div>
              <div>
                <Label>Tagline *</Label>
                <Input 
                  required 
                  value={formData.tagline} 
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })} 
                />
              </div>
            </div>

            <div>
              <Label>Description *</Label>
              <Textarea 
                required 
                rows={3} 
                value={formData.description} 
                onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
              />
            </div>

            <div>
              <Label>Logo URL *</Label>
              <Input 
                required 
                type="url" 
                value={formData.logo_url} 
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })} 
              />
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold text-lg mb-4">Social Links</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Website URL</Label>
                    <Input 
                      type="url" 
                      value={formData.website_url} 
                      onChange={(e) => setFormData({ ...formData, website_url: e.target.value })} 
                      placeholder="https://example.com"
                    />
                  </div>
                  <div>
                    <Label>Website Link Text</Label>
                    <Input 
                      type="text" 
                      value={formData.website_text} 
                      onChange={(e) => setFormData({ ...formData, website_text: e.target.value })} 
                      placeholder="Visit"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Instagram URL</Label>
                    <Input 
                      type="url" 
                      value={formData.instagram_url} 
                      onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })} 
                      placeholder="https://instagram.com/..."
                    />
                  </div>
                  <div>
                    <Label>Instagram Link Text</Label>
                    <Input 
                      type="text" 
                      value={formData.instagram_text} 
                      onChange={(e) => setFormData({ ...formData, instagram_text: e.target.value })} 
                      placeholder="Visit"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Facebook URL</Label>
                    <Input 
                      type="url" 
                      value={formData.facebook_url} 
                      onChange={(e) => setFormData({ ...formData, facebook_url: e.target.value })} 
                      placeholder="https://facebook.com/..."
                    />
                  </div>
                  <div>
                    <Label>Facebook Link Text</Label>
                    <Input 
                      type="text" 
                      value={formData.facebook_text} 
                      onChange={(e) => setFormData({ ...formData, facebook_text: e.target.value })} 
                      placeholder="Visit"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>WhatsApp URL</Label>
                    <Input 
                      type="url" 
                      value={formData.whatsapp_url} 
                      onChange={(e) => setFormData({ ...formData, whatsapp_url: e.target.value })} 
                      placeholder="https://wa.me/..."
                    />
                  </div>
                  <div>
                    <Label>WhatsApp Link Text</Label>
                    <Input 
                      type="text" 
                      value={formData.whatsapp_text} 
                      onChange={(e) => setFormData({ ...formData, whatsapp_text: e.target.value })} 
                      placeholder="Visit"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Google Review URL</Label>
                    <Input 
                      type="url" 
                      value={formData.google_review_url} 
                      onChange={(e) => setFormData({ ...formData, google_review_url: e.target.value })} 
                      placeholder="https://g.page/r/..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      To get direct review link: Search your business on Google Maps → Click "Write a review" → Copy the URL
                    </p>
                  </div>
                  <div>
                    <Label>Google Review Link Text</Label>
                    <Input 
                      type="text" 
                      value={formData.google_review_text} 
                      onChange={(e) => setFormData({ ...formData, google_review_text: e.target.value })} 
                      placeholder="Visit"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg">QR Codes</h3>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      qr_codes: [...formData.qr_codes, { title: '', url: '' }]
                    });
                  }}
                  className="bg-coral-500 hover:bg-coral-600"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add QR Code
                </Button>
              </div>
              <div className="space-y-3">
                {formData.qr_codes.map((qr, index) => (
                  <div key={index} className="grid grid-cols-12 gap-3 items-end p-3 bg-gray-50 rounded-lg">
                    <div className="col-span-4">
                      <Label>Title</Label>
                      <Input
                        value={qr.title}
                        onChange={(e) => {
                          const updated = [...formData.qr_codes];
                          updated[index] = { ...updated[index], title: e.target.value };
                          setFormData({ ...formData, qr_codes: updated });
                        }}
                        placeholder="e.g., Instagram"
                      />
                    </div>
                    <div className="col-span-7">
                      <Label>URL</Label>
                      <Input
                        type="url"
                        value={qr.url}
                        onChange={(e) => {
                          const updated = [...formData.qr_codes];
                          updated[index] = { ...updated[index], url: e.target.value };
                          setFormData({ ...formData, qr_codes: updated });
                        }}
                        placeholder="https://example.com"
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const updated = formData.qr_codes.filter((_, i) => i !== index);
                          setFormData({ ...formData, qr_codes: updated });
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {formData.qr_codes.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">No QR codes added. Click "Add QR Code" to create one.</p>
                )}
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold text-lg mb-4">Design Settings</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Gradient From (e.g., from-coral-400)</Label>
                  <Input 
                    value={formData.gradient_from} 
                    onChange={(e) => setFormData({ ...formData, gradient_from: e.target.value })} 
                    placeholder="from-coral-400"
                  />
                </div>
                <div>
                  <Label>Gradient To (e.g., to-orange-500)</Label>
                  <Input 
                    value={formData.gradient_to} 
                    onChange={(e) => setFormData({ ...formData, gradient_to: e.target.value })} 
                    placeholder="to-orange-500"
                  />
                </div>
                <div>
                  <Label>Background Gradient From</Label>
                  <Input 
                    value={formData.bg_gradient_from} 
                    onChange={(e) => setFormData({ ...formData, bg_gradient_from: e.target.value })} 
                    placeholder="from-orange-50"
                  />
                </div>
                <div>
                  <Label>Background Gradient Via</Label>
                  <Input 
                    value={formData.bg_gradient_via} 
                    onChange={(e) => setFormData({ ...formData, bg_gradient_via: e.target.value })} 
                    placeholder="via-white"
                  />
                </div>
                <div>
                  <Label>Background Gradient To</Label>
                  <Input 
                    value={formData.bg_gradient_to} 
                    onChange={(e) => setFormData({ ...formData, bg_gradient_to: e.target.value })} 
                    placeholder="to-orange-50/30"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Use Tailwind CSS gradient classes (e.g., from-blue-500, via-purple-500, to-pink-500)
              </p>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button type="submit" className="bg-coral-500 hover:bg-coral-600">Save Changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LinkPagesManagement;

