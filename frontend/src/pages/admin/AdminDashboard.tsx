import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  FileText,
  Briefcase,
  Mail,
  Info,
  Menu,
  X,
  Download,
  Trash2,
  Link as LinkIcon,
  CreditCard,
  Share2,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { getInquiries, deleteInquiry, exportInquiries, downloadCV } from '../../utils/api';
import { format } from 'date-fns';
import BrandsManagement from './BrandsManagement';
import CatalogsManagement from './CatalogsManagement';
import BlogManagement from './BlogManagement';
import CareersManagement from './CareersManagement';
import CompanyInfoManagement from './CompanyInfoManagement';
import LinkPagesManagement from './LinkPagesManagement';
import UPIPaymentManagement from './UPIPaymentManagement';
import SocialMediaManagement from './SocialMediaManagement';

const AdminDashboard: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const location = useLocation();
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Brands', path: '/admin/brands', icon: Package },
    { name: 'Catalogs', path: '/admin/catalogs', icon: FileText },
    { name: 'Blog', path: '/admin/blog', icon: FileText },
    { name: 'Careers', path: '/admin/careers', icon: Briefcase },
    { name: 'Link Pages', path: '/admin/link-pages', icon: LinkIcon },
    { name: 'UPI Payment', path: '/admin/upi-payment', icon: CreditCard },
    { name: 'Social Media', path: '/admin/social-media', icon: Share2 },
    { name: 'Inquiries', path: '/admin/inquiries', icon: Mail },
    { name: 'Company Info', path: '/admin/company', icon: Info },
  ];

  return (
    <div className="flex h-screen bg-gray-100" data-testid="admin-dashboard">
      {/* Sidebar */}
      <aside
        data-testid="admin-sidebar"
        className={`bg-gray-900 text-white transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        <div className="p-6 flex items-center justify-between">
          {sidebarOpen && (
            <h2 className="text-xl font-bold" data-testid="admin-sidebar-title">Admin Panel</h2>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            data-testid="sidebar-toggle-btn"
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <nav className="mt-6" data-testid="admin-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`admin-nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                className={`flex items-center space-x-3 px-6 py-3 transition-colors ${
                  isActive ? 'bg-coral-600 text-white' : 'hover:bg-gray-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                {sidebarOpen && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-6 left-0 right-0 px-6 space-y-3">
          {sidebarOpen && user && (
            <div className="text-sm text-gray-400 px-3 mb-2">
              Logged in as: <span className="text-white font-semibold">{user.username}</span>
            </div>
          )}
          <button
            onClick={handleLogout}
            data-testid="logout-btn"
            className="w-full flex items-center justify-center space-x-2 py-3 bg-red-600 hover:bg-red-700 rounded-lg transition-colors text-white"
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span>Logout</span>}
          </button>
          <Link
            to="/"
            data-testid="back-to-website-link"
            className="block text-center py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            {sidebarOpen ? 'Back to Website' : '←'}
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto" data-testid="admin-main-content">
        <div className="p-8">
          <Routes>
            <Route path="/" element={<DashboardHome />} />
            <Route path="/brands" element={<BrandsManagement />} />
            <Route path="/catalogs" element={<CatalogsManagement />} />
            <Route path="/blog" element={<BlogManagement />} />
            <Route path="/careers" element={<CareersManagement />} />
            <Route path="/link-pages" element={<LinkPagesManagement />} />
            <Route path="/upi-payment" element={<UPIPaymentManagement />} />
            <Route path="/social-media" element={<SocialMediaManagement />} />
            <Route path="/inquiries" element={<InquiriesManagement />} />
            <Route path="/company" element={<CompanyInfoManagement />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

const DashboardHome: React.FC = () => {
  return (
    <div data-testid="dashboard-home">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Inquiries', value: '-', color: 'coral' },
          { label: 'Brands', value: '2', color: 'blue' },
          { label: 'Blog Posts', value: '-', color: 'green' },
          { label: 'Career Openings', value: '-', color: 'purple' },
        ].map((stat, index) => (
          <div
            key={index}
            data-testid={`stat-card-${index}`}
            className="bg-white p-6 rounded-xl shadow-lg"
          >
            <p className="text-gray-600 text-sm mb-2">{stat.label}</p>
            <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const InquiriesManagement: React.FC = () => {
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchInquiries();
  }, []);

  const fetchInquiries = async () => {
    try {
      const response = await getInquiries();
      setInquiries(response.data);
    } catch (error) {
      toast.error('Failed to fetch inquiries');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this inquiry?')) return;

    try {
      await deleteInquiry(id);
      toast.success('Inquiry deleted successfully');
      fetchInquiries();
    } catch (error) {
      toast.error('Failed to delete inquiry');
    }
  };

  const handleExport = () => {
    window.open(exportInquiries(), '_blank');
  };

  const handleDownloadCV = (inquiryId: string, inquiryName: string) => {
    const url = downloadCV(inquiryId);
    // Create a temporary anchor element to trigger download
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.download = `${inquiryName}_CV`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div data-testid="inquiries-management">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Inquiries</h1>
        <Button
          onClick={handleExport}
          data-testid="export-inquiries-btn"
          className="bg-coral-500 hover:bg-coral-600 flex items-center space-x-2"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20" data-testid="inquiries-loading">
          <div className="w-12 h-12 border-4 border-coral-200 border-t-coral-500 rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <Table data-testid="inquiries-table">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>CV</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inquiries.map((inquiry) => (
                <TableRow key={inquiry.id} data-testid={`inquiry-row-${inquiry.id}`}>
                  <TableCell>{inquiry.name}</TableCell>
                  <TableCell>{inquiry.email}</TableCell>
                  <TableCell className="capitalize">{inquiry.inquiry_type}</TableCell>
                  <TableCell className="max-w-xs truncate">{inquiry.message}</TableCell>
                  <TableCell>{format(new Date(inquiry.created_at), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>
                    {inquiry.cv_filename ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadCV(inquiry.id || inquiry._id, inquiry.name)}
                        data-testid={`download-cv-${inquiry.id || inquiry._id}`}
                        className="text-blue-600 hover:text-blue-700"
                        title="Download CV"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    ) : (
                      <span className="text-gray-400 text-sm">No CV</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(inquiry.id || inquiry._id)}
                      data-testid={`delete-inquiry-${inquiry.id || inquiry._id}`}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;