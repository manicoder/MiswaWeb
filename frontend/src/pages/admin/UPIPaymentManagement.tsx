import React, { useState, useEffect } from 'react';
import { CreditCard, Upload, X, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { getUPIPaymentInfo, updateUPIPaymentInfo, uploadUPILogo, uploadUPIQRCode, UPIPaymentInfo } from '../../utils/api';
import { toast } from 'sonner';

const UPIPaymentManagement: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [uploadingLogo, setUploadingLogo] = useState<boolean>(false);
  const [uploadingQR, setUploadingQR] = useState<boolean>(false);
  const [formData, setFormData] = useState<UPIPaymentInfo>({
    company_name: '',
    brand_name: '',
    gst_number: '',
    upi_id: '',
    qr_code_url: '',
    logo_url: '',
  });

  useEffect(() => {
    fetchUPIInfo();
  }, []);

  const fetchUPIInfo = async () => {
    try {
      const response = await getUPIPaymentInfo();
      setFormData(response.data);
    } catch (error) {
      toast.error('Failed to fetch UPI payment info');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload PNG, JPG, GIF, WEBP, or SVG.');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size too large. Maximum size is 5MB.');
      return;
    }

    setUploadingLogo(true);
    try {
      const response = await uploadUPILogo(file);
      setFormData({ ...formData, logo_url: response.data.url });
      toast.success('Logo uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload logo');
      console.error('Upload error:', error);
    } finally {
      setUploadingLogo(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleQRCodeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload PNG, JPG, GIF, WEBP, or SVG.');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size too large. Maximum size is 5MB.');
      return;
    }

    setUploadingQR(true);
    try {
      const response = await uploadUPIQRCode(file);
      setFormData({ ...formData, qr_code_url: response.data.url });
      toast.success('QR code uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload QR code');
      console.error('Upload error:', error);
    } finally {
      setUploadingQR(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await updateUPIPaymentInfo(formData);
      toast.success('UPI payment info updated successfully');
      fetchUPIInfo();
    } catch (error) {
      toast.error('Failed to update UPI payment info');
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
    <div data-testid="upi-payment-management">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
          <CreditCard className="w-8 h-8 text-coral-500" />
          <span>UPI Payment Info</span>
        </h1>
        <p className="text-gray-600 mt-2">
          Manage UPI payment information displayed on the payment page
        </p>
      </div>

      <Card className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
          <CardDescription>
            Update the UPI payment information that will be displayed on the payment page
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="company_name">Company Name *</Label>
                <Input
                  id="company_name"
                  required
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder="Miswa International"
                />
              </div>

              <div>
                <Label htmlFor="brand_name">Brand Name *</Label>
                <Input
                  id="brand_name"
                  required
                  value={formData.brand_name}
                  onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                  placeholder="Miswa International"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="gst_number">GST Number *</Label>
                <Input
                  id="gst_number"
                  required
                  value={formData.gst_number}
                  onChange={(e) => setFormData({ ...formData, gst_number: e.target.value.toUpperCase() })}
                  placeholder="29ABCDE1234F1Z5"
                />
              </div>

              <div>
                <Label htmlFor="upi_id">UPI ID *</Label>
                <Input
                  id="upi_id"
                  required
                  value={formData.upi_id}
                  onChange={(e) => setFormData({ ...formData, upi_id: e.target.value.toLowerCase() })}
                  placeholder="name@paytm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Format: name@paytm, name@okaxis, name@ybl, etc.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="logo_file">Logo</Label>
                <div className="mt-2">
                  <label
                    htmlFor="logo_file"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      {uploadingLogo ? (
                        <Loader2 className="w-8 h-8 mb-2 text-gray-500 animate-spin" />
                      ) : formData.logo_url ? (
                        <div className="relative">
                          <img
                            src={formData.logo_url}
                            alt="Logo preview"
                            className="max-w-full max-h-24 object-contain rounded"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFormData({ ...formData, logo_url: '' });
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 mb-2 text-gray-500" />
                          <p className="mb-2 text-sm text-gray-500">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-gray-500">PNG, JPG, GIF, WEBP or SVG (MAX. 5MB)</p>
                        </>
                      )}
                    </div>
                    <input
                      id="logo_file"
                      type="file"
                      className="hidden"
                      accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo}
                    />
                  </label>
                </div>
              </div>

              <div>
                <Label htmlFor="qr_code_file">QR Code Image *</Label>
                <div className="mt-2">
                  <label
                    htmlFor="qr_code_file"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      {uploadingQR ? (
                        <Loader2 className="w-8 h-8 mb-2 text-gray-500 animate-spin" />
                      ) : formData.qr_code_url ? (
                        <div className="relative">
                          <img
                            src={formData.qr_code_url}
                            alt="QR Code preview"
                            className="max-w-full max-h-24 object-contain rounded"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFormData({ ...formData, qr_code_url: '' });
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 mb-2 text-gray-500" />
                          <p className="mb-2 text-sm text-gray-500">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-gray-500">PNG, JPG, GIF, WEBP or SVG (MAX. 5MB)</p>
                        </>
                      )}
                    </div>
                    <input
                      id="qr_code_file"
                      type="file"
                      className="hidden"
                      accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml"
                      onChange={handleQRCodeUpload}
                      disabled={uploadingQR}
                      required={!formData.qr_code_url}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={fetchUPIInfo}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-coral-500 hover:bg-coral-600"
              >
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-xl mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
        <CardHeader>
          <CardTitle className="text-blue-900">Preview</CardTitle>
          <CardDescription>
            This is how the payment page will look to users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-white rounded-xl p-8 shadow-lg">
            <div className="text-center space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{formData.company_name || 'Company Name'}</h2>
                <p className="text-lg text-gray-600 mt-1">{formData.brand_name || 'Brand Name'}</p>
              </div>
              
              {formData.qr_code_url ? (
                <div className="flex justify-center">
                  <div className="p-4 bg-white border-2 border-gray-200 rounded-xl inline-block">
                    <img
                      src={formData.qr_code_url}
                      alt="UPI QR Code"
                      className="w-48 h-48 object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex justify-center">
                  <div className="w-48 h-48 bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center">
                    <p className="text-gray-400 text-sm">QR Code will appear here</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {formData.upi_id && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-600">UPI ID</p>
                    <p className="text-lg font-semibold text-gray-900">{formData.upi_id}</p>
                  </div>
                )}
                {formData.gst_number && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-600">GST Number</p>
                    <p className="text-lg font-semibold text-gray-900">{formData.gst_number}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UPIPaymentManagement;

