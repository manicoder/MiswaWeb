import React, { useEffect, useMemo, useRef, useState } from 'react';
import { UploadedFileItem, listUploadedFiles, deleteUploadedFile, uploadAsset } from '../../utils/api';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { toast } from 'sonner';
import { Trash2, RefreshCw, Upload, Copy as CopyIcon, Image as ImageIcon, FileText } from 'lucide-react';

const FilesManagement: React.FC = () => {
  const [files, setFiles] = useState<UploadedFileItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [replacing, setReplacing] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fileToReplaceRef = useRef<UploadedFileItem | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await listUploadedFiles();
      setFiles(res.data);
    } catch (e) {
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const grouped = useMemo(() => {
    const byCat: Record<string, UploadedFileItem[]> = {};
    for (const f of files) {
      if (!byCat[f.category]) byCat[f.category] = [];
      byCat[f.category].push(f);
    }
    return byCat;
  }, [files]);

  const toAbsolute = (url: string) => {
    if (!url.startsWith('http')) {
      const base = (window as any).APP_CONFIG?.BACKEND_URL || process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
      return `${base}${url}`;
    }
    return url;
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success('Copied URL');
  };

  const handleDelete = async (file: UploadedFileItem) => {
    if (!window.confirm(`Delete ${file.filename}?`)) return;
    try {
      await deleteUploadedFile(file.category, file.filename);
      toast.success('Deleted');
      refresh();
    } catch {
      toast.error('Delete failed');
    }
  };

  const openReplace = (file: UploadedFileItem) => {
    fileToReplaceRef.current = file;
    setReplacing(file.filename);
    fileInputRef.current?.click();
  };

  const onFileSelected: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    const target = fileToReplaceRef.current;
    e.target.value = '';
    if (!file || !target) {
      setReplacing(null);
      return;
    }
    try {
      const res = await uploadAsset(file);
      const newUrl = res.data.url;
      // After successful upload, delete old
      await deleteUploadedFile(target.category, target.filename);
      toast.success('Replaced file');
      refresh();
      // Show the new URL for convenience
      toast.message('New file URL', {
        description: toAbsolute(newUrl),
      });
    } catch {
      toast.error('Replace failed');
    } finally {
      setReplacing(null);
      fileToReplaceRef.current = null;
    }
  };

  return (
    <div data-testid="files-management">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Files</h1>
        <div className="flex items-center gap-3">
          <input ref={fileInputRef} className="hidden" type="file" onChange={onFileSelected} />
          <Button onClick={refresh} className="bg-coral-500 hover:bg-coral-600" data-testid="refresh-files">
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-12 h-12 border-4 border-coral-200 border-t-coral-500 rounded-full animate-spin"></div>
        </div>
      ) : (
        Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="mb-10">
            <h2 className="text-xl font-semibold mb-4 capitalize">{category.replace('/', ' / ')}</h2>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Preview</TableHead>
                    <TableHead>Filename</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Modified</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((f) => {
                    const absUrl = toAbsolute(f.url);
                    const isImage = /\.(png|jpe?g|gif|webp|svg)$/i.test(f.filename);
                    return (
                      <TableRow key={`${category}:${f.filename}`}>
                        <TableCell>
                          {isImage ? (
                            <img src={absUrl} alt={f.filename} className="w-12 h-12 object-cover rounded" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
                          ) : (
                            <div className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded">
                              <FileText className="w-6 h-6 text-gray-500" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{f.filename}</TableCell>
                        <TableCell className="max-w-md">
                          <div className="flex items-center gap-2">
                            <a href={absUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate">{absUrl}</a>
                            <Button variant="ghost" size="sm" onClick={() => handleCopy(absUrl)} title="Copy URL">
                              <CopyIcon className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>{(f.size_bytes / 1024).toFixed(1)} KB</TableCell>
                        <TableCell>{new Date(f.modified_at).toLocaleString()}</TableCell>
                        <TableCell className="space-x-2">
                          <Button variant="outline" size="sm" onClick={() => openReplace(f)} disabled={replacing === f.filename} title="Replace with new upload">
                            <Upload className="w-4 h-4 mr-1" /> {replacing === f.filename ? 'Replacing...' : 'Replace'}
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDelete(f)} title="Delete">
                            <Trash2 className="w-4 h-4 mr-1" /> Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default FilesManagement;


