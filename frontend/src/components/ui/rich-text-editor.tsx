import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  modules?: any;
  formats?: string[];
  className?: string;
}

export interface RichTextEditorHandle {
  getEditor: () => Quill | null;
}

const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(
  ({ value, onChange, placeholder, modules, formats, className }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const quillRef = useRef<Quill | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const valueRef = useRef(value);
    const onChangeRef = useRef(onChange);

    // Keep refs in sync with props
    useEffect(() => {
      valueRef.current = value;
    }, [value]);

    useEffect(() => {
      onChangeRef.current = onChange;
    }, [onChange]);

    useImperativeHandle(ref, () => ({
      getEditor: () => quillRef.current,
    }));

    useEffect(() => {
      if (!editorRef.current || quillRef.current) return;

      const toolbarOptions = modules?.toolbar || [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'indent': '-1'}, { 'indent': '+1' }],
        ['link'],
        ['clean']
      ];

      const defaultModules = {
        toolbar: toolbarOptions,
        ...modules,
      };

      const defaultFormats = formats || [
        'header',
        'bold', 'italic', 'underline', 'strike',
        'list', 'bullet', 'indent',
        'link'
      ];

      quillRef.current = new Quill(editorRef.current, {
        theme: 'snow',
        placeholder: placeholder || '',
        modules: defaultModules,
        formats: defaultFormats,
      });

      const quill = quillRef.current;

      // Set initial value
      if (valueRef.current) {
        quill.root.innerHTML = valueRef.current;
      }

      // Handle text changes
      const handleTextChange = () => {
        const html = quill.root.innerHTML;
        const normalizedHtml = html === '<p><br></p>' ? '' : html;
        // Check if content actually changed to avoid infinite loops
        if (normalizedHtml !== valueRef.current) {
          onChangeRef.current(normalizedHtml);
        }
      };

      quill.on('text-change', handleTextChange);

      // Cleanup function
      return () => {
        if (quillRef.current) {
          quill.off('text-change', handleTextChange);
        }
      };
    }, []); // Only run once on mount

    // Update content when value prop changes externally
    useEffect(() => {
      if (quillRef.current && value !== undefined) {
        const currentContent = quillRef.current.root.innerHTML;
        const normalizedValue = value || '';
        const normalizedCurrent = currentContent || '';
        
        // Only update if different to avoid cursor jumping
        if (normalizedCurrent !== normalizedValue && normalizedValue !== '<p><br></p>') {
          const selection = quillRef.current.getSelection();
          const length = quillRef.current.getLength();
          quillRef.current.root.innerHTML = normalizedValue;
          // Restore cursor position at the end if we lost it
          if (selection && selection.index <= length) {
            try {
              quillRef.current.setSelection(selection);
            } catch {
              // If selection restoration fails, place cursor at end
              quillRef.current.setSelection(quillRef.current.getLength());
            }
          }
        }
      }
    }, [value]);

    return (
      <div ref={containerRef} className={className}>
        <div ref={editorRef} style={{ minHeight: '200px' }} />
      </div>
    );
  }
);

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;

