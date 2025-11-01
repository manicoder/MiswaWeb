import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { getCompanyInfo, updateCompanyInfo } from '../../utils/api';
import { toast } from 'sonner';

const CompanyInfoManagement: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    about: '',
    mission: '',
    vision: '',
    phone: '',
    email: '',
    address: '',
  });

  useEffect(() => {
    fetchCompanyInfo();
  }, []);

  const fetchCompanyInfo = async () => {
    try {
      const response = await getCompanyInfo();
      setFormData({
        about: (response.data as any).about || '',
        mission: response.data.mission || '',
        vision: response.data.vision || '',
        phone: (response.data as any).phone || response.data.contactPhone || '',
        email: (response.data as any).email || response.data.contactEmail || '',
        address: response.data.address || '',
      });
    } catch (error) {
      toast.error('Failed to fetch company info');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateCompanyInfo({
        ...formData,
        contactPhone: formData.phone,
        contactEmail: formData.email,
      } as any);
      toast.success('Company information updated successfully');
      fetchCompanyInfo();
    } catch (error) {
      toast.error('Failed to update company info');
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
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Company Information</h1>
        <p className="text-gray-600">Update your company details that appear on the About page and Contact page</p>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label className="text-base font-semibold">About Company *</Label>
            <Textarea
              required
              rows={6}
              value={formData.about}
              onChange={(e) => setFormData({ ...formData, about: e.target.value })}
              placeholder="Brief description about your company"
              className="mt-2"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="text-base font-semibold">Mission Statement *</Label>
              <Textarea
                required
                rows={6}
                value={formData.mission}
                onChange={(e) => setFormData({ ...formData, mission: e.target.value })}
                placeholder="Your company's mission"
                className="mt-2"
              />
            </div>

            <div>
              <Label className="text-base font-semibold">Vision Statement *</Label>
              <Textarea
                required
                rows={6}
                value={formData.vision}
                onChange={(e) => setFormData({ ...formData, vision: e.target.value })}
                placeholder="Your company's vision"
                className="mt-2"
              />
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-base font-semibold">Phone Number *</Label>
                <Input
                  required
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 1234567890"
                  className="mt-2 h-12"
                />
              </div>

              <div>
                <Label className="text-base font-semibold">Email Address *</Label>
                <Input
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="info@company.com"
                  className="mt-2 h-12"
                />
              </div>
            </div>

            <div className="mt-6">
              <Label className="text-base font-semibold">Physical Address *</Label>
              <Textarea
                required
                rows={3}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Full company address"
                className="mt-2"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
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
        </form>
      </div>
    </div>
  );
};

export default CompanyInfoManagement;
