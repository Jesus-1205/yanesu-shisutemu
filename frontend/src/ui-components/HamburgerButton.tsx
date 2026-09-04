import type { ButtonHTMLAttributes } from "react";

interface HamburgerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  open: boolean;
}

export default function HamburgerButton({
  open,
  className = "",
  ...props
}: HamburgerButtonProps) {
  return (
    <button
      className={`
        relative h-[30px] w-10 cursor-pointer bg-transparent
        ${className}
      `}
      aria-label={open ? "Close menu" : "Open menu"}
      {...props}
    >
      <span
        className={`
          absolute left-0 block h-1 w-full origin-left rounded-full
          bg-text-main transition-all duration-250 ease-in-out
          ${open ? "top-0 left-[5px] rotate-45" : "top-0"}
        `}
      />
      <span
        className={`
          absolute left-0 block h-1 rounded-full bg-text-main
          transition-all duration-250 ease-in-out
          ${open ? "top-1/2 w-0 opacity-0" : "top-1/2 w-full -translate-y-1/2"}
        `}
      />
      <span
        className={`
          absolute left-0 block h-1 w-full origin-left rounded-full
          bg-text-main transition-all duration-250 ease-in-out
          ${open ? "top-full left-[5px] -translate-y-full -rotate-45" : "top-full -translate-y-full"}
        `}
      />
    </button>
  );
}
