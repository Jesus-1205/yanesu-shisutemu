export interface LayoutOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function LayoutOverlay({ open, onClose }: LayoutOverlayProps) {
  if (!open) return null;

  return (
    <div
      data-testid="layout-overlay"
      className="fixed inset-0 z-20 bg-black/40 lg:hidden"
      onClick={onClose}
    />
  );
}
