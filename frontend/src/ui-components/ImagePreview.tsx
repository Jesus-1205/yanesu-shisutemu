import { useEffect, useState } from "react";
import { X } from "lucide-react";

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
      <div
        className={`group relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50 transition-colors hover:border-brand-blue ${className}`}
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(true)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setExpanded(true); }}
      >
        <img
          src={url}
          alt={alt}
          className="h-48 w-full cursor-pointer object-contain"
        />
        <div className="pointer-events-none absolute top-2 right-2 rounded-md bg-black/50 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100">
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
        </div>
      </div>

      {expanded && (
        <div
          className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/80 p-4"
          onClick={() => setExpanded(false)}
        >
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="absolute top-4 right-4 z-10 cursor-pointer rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/30"
          >
            <X className="size-6" />
          </button>
          <img
            src={url}
            alt={alt}
            className="max-h-full max-w-full cursor-pointer rounded-lg object-contain"
            onClick={() => setExpanded(false)}
          />
        </div>
      )}
    </>
  );
}
