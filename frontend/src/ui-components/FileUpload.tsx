import { useRef, useState, useCallback, useEffect, type DragEvent } from "react";
import { Upload, X } from "lucide-react";

interface FileUploadProps {
  accept?: string;
  maxSize?: number;
  onFilesChange?: (files: File[]) => void;
  className?: string;
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const MIME_LABELS: Record<string, string> = {
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "image/webp": "WebP",
  "image/gif": "GIF",
  "image/svg+xml": "SVG",
  "application/pdf": "PDF",
  "application/json": "JSON",
  "text/csv": "CSV",
  "text/plain": "TXT",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  "application/vnd.ms-excel": "XLS",
};

const GROUP_LABELS: Record<string, string> = {
  "image/*": "Imágenes",
  "audio/*": "Audios",
  "video/*": "Videos",
  "text/*": "Textos",
  "application/*": "Documentos",
};

function describeAccept(accept: string): { group: string; extensions: string } {
  const types = accept.split(",").map((t) => t.trim());

  const labels: string[] = [];
  const extSet: string[] = [];

  for (const t of types) {
    if (t.endsWith("/*")) {
      // Wildcard: "image/*" → "Imágenes" + sus extensiones
      const group = GROUP_LABELS[t] ?? "Archivos";
      labels.push(group);
      const exts = Object.entries(MIME_LABELS)
        .filter(([mime]) => mime.startsWith(t.replace("*", "")))
        .map(([, label]) => label);
      extSet.push(...exts.slice(0, 5));
    } else if (t.startsWith(".")) {
      // Extensión directa: ".pdf" → "PDF"
      extSet.push(t.slice(1).toUpperCase());
    } else {
      // MIME específico
      extSet.push(MIME_LABELS[t] ?? t.split("/").pop()?.toUpperCase() ?? t);
    }
  }

  return {
    group: labels.length > 0 ? labels.join(", ") : extSet.join(", "),
    extensions: [...new Set(extSet)].join(", "),
  };
}

export default function FileUpload({
  accept = "image/*",
  maxSize = 5 * 1024 * 1024,
  onFilesChange,
  className = "",
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const { group, extensions } = describeAccept(accept);

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const valid = Array.from(newFiles).filter((f) => f.size <= maxSize);
      setFiles((prev) => [...prev, ...valid]);
    },
    [maxSize],
  );

  const removeFile = useCallback(
    (index: number) => {
      setFiles((prev) => prev.filter((_, i) => i !== index));
    },
    [],
  );

  // Sincronizar archivos con el componente padre
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    onFilesChange?.(files);
  }, [files]);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragging(false);
  };

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`
          flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl
          border-2 border-dashed px-6 py-8
          transition-all duration-150
          ${
            dragging
              ? "border-brand-blue bg-blue-50"
              : "border-slate-300 bg-surface hover:border-slate-400"
          }
        `}
      >
        <Upload className={`size-8 ${dragging ? "text-brand-blue" : "text-slate-400"}`} />
        <p className="text-sm font-medium text-slate-600">
          {dragging ? "Suelta los archivos aquí" : `Arrastra ${group.toLowerCase()} o haz clic`}
        </p>
        <p className="text-xs text-slate-400">
          {extensions} &middot; máx {formatSize(maxSize)} por archivo
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          className="hidden"
          autoComplete="off"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
          }}
        />
      </div>

      {files.length > 0 && (
        <ul className="flex flex-col gap-2">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
            >
              <span className="flex-1 truncate text-text-main">{file.name}</span>
              <span className="shrink-0 text-xs text-slate-400">{formatSize(file.size)}</span>
              <button
                onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                className="shrink-0 cursor-pointer text-slate-400 transition-colors hover:text-danger"
                aria-label={`Eliminar ${file.name}`}
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
