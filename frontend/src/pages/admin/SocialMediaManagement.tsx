import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Edit2, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { getSocialMediaInfo, updateSocialMediaInfo } from '../../utils/api';
import { toast } from 'sonner';

interface SocialMediaLink {
  icon: string;
  title: string;
  url: string;
}

const SocialMediaManagement: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [links, setLinks] = useState<SocialMediaLink[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<SocialMediaLink>({
    icon: 'Facebook',
    title: '',
    url: '',
  });

  // Common social media icons available in lucide-react
  const availableIcons = [
    'Facebook',
    'Twitter',
    'Instagram',
    'Linkedin',
    'Youtube',
    'Github',
    'Globe',
    'Mail',
    'MessageCircle',
    'Phone',
    'Share2',
  ];

  useEffect(() => {
    fetchSocialMediaInfo();
  }, []);

  const fetchSocialMediaInfo = async () => {
    try {
      const response = await getSocialMediaInfo();
      setLinks(response.data.links || []);
    } catch (error) {
      toast.error('Failed to fetch social media links');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    if (!formData.title || !formData.url) {
      toast.error('Please fill in all required fields');
      return;
    }
    setLinks([...links, { ...formData }]);
    setFormData({ icon: 'Facebook', title: '', url: '' });
    toast.success('Link added');
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setFormData(links[index]);
  };

  const handleUpdate = () => {
    if (editingIndex === null || !formData.title || !formData.url) {
      toast.error('Please fill in all required fields');
      return;
    }
    const updatedLinks = [...links];
    updatedLinks[editingIndex] = { ...formData };
    setLinks(updatedLinks);
    setEditingIndex(null);
    setFormData({ icon: 'Facebook', title: '', url: '' });
    toast.success('Link updated');
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setFormData({ icon: 'Facebook', title: '', url: '' });
  };

  const handleDelete = (index: number) => {
    if (window.confirm('Are you sure you want to delete this social media link?')) {
      const updatedLinks = links.filter((_, i) => i !== index);
      setLinks(updatedLinks);
      toast.success('Link deleted');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSocialMediaInfo({ links });
      toast.success('Social media links updated successfully');
      fetchSocialMediaInfo();
    } catch (error) {
      toast.error('Failed to update social media links');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-12 h-12 border-4 border-coral-200 border-t-coral-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div data-testid="social-media-management">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Social Media Links</h1>
        <p className="text-gray-600">Manage social media links that appear in the footer</p>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Add/Edit Form */}
          <div className="border-b pb-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingIndex !== null ? 'Edit Link' : 'Add New Link'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-base font-semibold">Icon *</Label>
                <select
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="mt-2 w-full h-12 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-coral-500"
                >
                  {availableIcons.map((icon) => (
                    <option key={icon} value={icon}>
                      {icon}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-base font-semibold">Title *</Label>
                <Input
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Facebook, Instagram"
                  className="mt-2 h-12"
                />
              </div>

              <div>
                <Label className="text-base font-semibold">URL *</Label>
                <Input
                  required
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://..."
                  className="mt-2 h-12"
                />
              </div>
            </div>

            <div className="flex space-x-2 mt-4">
              {editingIndex !== null ? (
                <>
                  <Button
                    type="button"
                    onClick={handleUpdate}
                    className="bg-coral-500 hover:bg-coral-600"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Update Link
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  onClick={handleAdd}
                  className="bg-coral-500 hover:bg-coral-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Link
                </Button>
              )}
            </div>
          </div>

          {/* Links List */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Current Links</h3>
            {links.length === 0 ? (
              <p className="text-gray-500 py-4">No social media links added yet.</p>
            ) : (
              <div className="space-y-3">
                {links.map((link, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded-lg">
                        <span className="text-sm font-medium text-gray-600">{link.icon}</span>
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{link.title}</div>
                        <div className="text-sm text-gray-500 truncate max-w-md">{link.url}</div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(index)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Save Button */}
          {links.length > 0 && (
            <div className="flex justify-end pt-4 border-t">
              <Button
                type="submit"
                disabled={saving}
                className="bg-coral-500 hover:bg-coral-600 text-white px-8 py-3 text-lg"
              >
                {saving ? (
                  <>
                    <span className="mr-2">Saving...</span>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default SocialMediaManagement;

