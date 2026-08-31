import { useEffect, useState } from "react";
import { Maximize2, X } from "lucide-react";

interface ImagePreviewProps {
  file: File;
  alt?: string;
  className?: string;
}

export default function ImagePreview({ file, alt = "Vista previa", className = "" }: ImagePreviewProps) {
  const [url, setUrl] = useState<string>("");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (!url) return null;

  return (
    <>
      <div className={`relative group rounded-lg border border-slate-200 bg-slate-50 overflow-hidden ${className}`}>
        <img
          src={url}
          alt={alt}
          className="w-full h-48 object-contain"
        />
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="absolute top-2 right-2 p-1.5 rounded-md bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-black/70"
          title="Expandir imagen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setExpanded(false)}
        >
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={url}
            alt={alt}
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
