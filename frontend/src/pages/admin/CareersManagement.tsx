import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { getCareers, createCareer, updateCareer, deleteCareer } from '../../utils/api';
import { toast } from 'sonner';
import RichTextEditor from '../../components/ui/rich-text-editor';

const CareersManagement: React.FC = () => {
  const [careers, setCareers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showDialog, setShowDialog] = useState<boolean>(false);
  const [editingCareer, setEditingCareer] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    location: '',
    type: 'Full-time',
    description: '',
    requirements: '',
    active: true,
  });

  useEffect(() => {
    fetchCareers();
  }, []);

  const fetchCareers = async () => {
    try {
      const response = await getCareers(false);
      setCareers(response.data);
    } catch (error) {
      toast.error('Failed to fetch careers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      // Send HTML content directly without splitting requirements
      const dataToSend = {
        ...formData,
        requirements: formData.requirements, // Keep as HTML string
      };
      if (editingCareer) {
        await updateCareer(editingCareer.id, dataToSend);
        toast.success('Career updated successfully');
      } else {
        await createCareer(dataToSend);
        toast.success('Career created successfully');
      }
      setShowDialog(false);
      setEditingCareer(null);
      setFormData({ title: '', department: '', location: '', type: 'Full-time', description: '', requirements: '', active: true });
      fetchCareers();
    } catch (error) {
      toast.error('Failed to save career');
    }
  };

  const handleEdit = (career: any) => {
    setEditingCareer(career);
    setFormData({
      title: career.title,
      department: career.department,
      location: career.location,
      type: career.type,
      description: career.description || '',
      // Handle both HTML string and array format for backwards compatibility
      requirements: Array.isArray(career.requirements) 
        ? career.requirements.map((r: string) => `<p>${r}</p>`).join('') 
        : career.requirements || '',
      active: career.active,
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this job posting?')) return;
    try {
      await deleteCareer(id);
      toast.success('Career deleted successfully');
      fetchCareers();
    } catch (error) {
      toast.error('Failed to delete career');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Careers Management</h1>
        <Button
          onClick={() => {
            setEditingCareer(null);
            setFormData({ title: '', department: '', location: '', type: 'Full-time', description: '', requirements: '', active: true });
            setShowDialog(true);
          }}
          className="bg-coral-500 hover:bg-coral-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Job Posting
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
                <TableHead>Department</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {careers.map((career) => (
                <TableRow key={career.id}>
                  <TableCell className="font-medium">{career.title}</TableCell>
                  <TableCell>{career.department}</TableCell>
                  <TableCell>{career.location}</TableCell>
                  <TableCell>{career.type}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${career.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {career.active ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(career)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(career.id)} className="text-red-600">
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCareer ? 'Edit Job Posting' : 'Add New Job Posting'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Job Title *</Label>
              <Input required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Department *</Label>
                <Input required value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} />
              </div>
              <div>
                <Label>Location *</Label>
                <Input required value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="e.g., Hyderabad, India" />
              </div>
            </div>
            <div>
              <Label>Job Type *</Label>
              <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full px-3 py-2 border rounded-md">
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
              </select>
            </div>
            <div>
              <Label>Description *</Label>
              <div className="mb-4">
                <RichTextEditor
                  value={formData.description}
                  onChange={(value) => setFormData({ ...formData, description: value })}
                  placeholder="Job description and responsibilities"
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      [{ 'indent': '-1'}, { 'indent': '+1' }],
                      ['link'],
                      ['clean']
                    ],
                  }}
                  formats={[
                    'header',
                    'bold', 'italic', 'underline', 'strike',
                    'list', 'bullet', 'indent',
                    'link'
                  ]}
                />
              </div>
            </div>
            <div>
              <Label>Requirements *</Label>
              <div className="mb-4">
                <RichTextEditor
                  value={formData.requirements}
                  onChange={(value) => setFormData({ ...formData, requirements: value })}
                  placeholder="Required qualifications and skills"
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      [{ 'indent': '-1'}, { 'indent': '+1' }],
                      ['link'],
                      ['clean']
                    ],
                  }}
                  formats={[
                    'header',
                    'bold', 'italic', 'underline', 'strike',
                    'list', 'bullet', 'indent',
                    'link'
                  ]}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="active" checked={formData.active} onChange={(e) => setFormData({ ...formData, active: e.target.checked })} className="w-4 h-4" />
              <Label htmlFor="active">Active (visible on careers page)</Label>
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

export default CareersManagement;