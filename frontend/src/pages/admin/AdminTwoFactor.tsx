import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../../components/ui/input-otp';
import { verifyTwoFactor, setAuthToken } from '../../utils/api';
import { toast } from 'sonner';

const AdminTwoFactor: React.FC = () => {
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation() as any;
  const username = location.state?.username as string | undefined;

  useEffect(() => {
    const temp = sessionStorage.getItem('admin_temp_token');
    if (!temp) {
      navigate('/admin/login', { replace: true });
    }
  }, [navigate]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const temp = sessionStorage.getItem('admin_temp_token');
    if (!temp) {
      toast.error('Session expired. Please login again.');
      navigate('/admin/login', { replace: true });
      return;
    }
    if (code.length < 6) {
      toast.error('Enter the 6-digit code');
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await verifyTwoFactor({ code, temp_token: temp });
      const { access_token } = res.data;
      if (!access_token) {
        throw new Error('Invalid response');
      }
      // Persist token and set header
      localStorage.setItem('admin_token', access_token);
      setAuthToken(access_token);
      sessionStorage.removeItem('admin_temp_token');
      toast.success('2FA verified');
      // Hard reload to let AuthProvider reinitialize with the new token
      window.location.href = '/admin';
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Verification failed';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-coral-50 via-orange-50 to-yellow-50 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">Two-Factor Authentication</CardTitle>
          <CardDescription>
            {username ? `Enter the 6-digit code for ${username}` : 'Enter the 6-digit code from your authenticator app'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="otp">Authentication code</Label>
              <InputOTP
                id="otp"
                value={code}
                onChange={setCode}
                maxLength={6}
              >
                <div className="flex gap-2">
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </div>
              </InputOTP>
            </div>
            <Button
              type="submit"
              className="w-full bg-coral-600 hover:bg-coral-700 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Verifying...' : 'Verify'}
            </Button>
            <div className="text-xs text-gray-500 text-center">
              Lost access? Contact your administrator to reset 2FA.
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminTwoFactor;


