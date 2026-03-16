import { useRef, useState, useCallback } from 'react';
import { Paperclip, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  label?: string;
  hint?: string;
  maxSizeMB?: number;
  onChange?: (files: File[]) => void;
  className?: string;
}

interface SelectedFile {
  file: File;
  previewUrl?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUpload({
  accept,
  multiple = false,
  label,
  hint,
  maxSizeMB = 10,
  onChange,
  className,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<SelectedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  const addFiles = useCallback(
    (incoming: FileList | null) => {
      if (!incoming) return;
      setError('');
      const maxBytes = maxSizeMB * 1024 * 1024;
      const valid: SelectedFile[] = [];
      let errMsg = '';

      Array.from(incoming).forEach((file) => {
        if (file.size > maxBytes) {
          errMsg = `${file.name} exceeds ${maxSizeMB} MB limit.`;
          return;
        }
        const isImage = file.type.startsWith('image/');
        const previewUrl = isImage ? URL.createObjectURL(file) : undefined;
        valid.push({ file, previewUrl });
      });

      if (errMsg) setError(errMsg);

      setSelected((prev) => {
        const next = multiple ? [...prev, ...valid] : valid;
        onChange?.(next.map((s) => s.file));
        return next;
      });
    },
    [maxSizeMB, multiple, onChange]
  );

  const remove = (index: number) => {
    setSelected((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (prev[index].previewUrl) URL.revokeObjectURL(prev[index].previewUrl!);
      onChange?.(next.map((s) => s.file));
      return next;
    });
    if (inputRef.current) inputRef.current.value = '';
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };
  const onDragLeave = () => setDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      )}

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          'border border-dashed border-border px-3 py-2.5 flex items-center gap-2.5 cursor-pointer transition-colors select-none',
          dragging ? 'bg-muted/40 border-foreground/30' : 'hover:bg-muted/20'
        )}
      >
        <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <p className="text-xs text-muted-foreground">
          {hint ?? (multiple ? 'Attach files' : 'Attach a file')}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {error && <p className="text-[11px] text-destructive">{error}</p>}

      {selected.length > 0 && (
        <ul className="space-y-1.5">
          {selected.map(({ file, previewUrl }, i) => (
            <li
              key={`${file.name}-${i}`}
              className="flex items-center gap-2 border border-border px-3 py-2"
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={file.name}
                  className="h-8 w-8 object-cover border border-border shrink-0"
                />
              ) : (
                <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs truncate">{file.name}</p>
                <p className="text-[11px] text-muted-foreground">{formatBytes(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); remove(i); }}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                aria-label="Remove file"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
