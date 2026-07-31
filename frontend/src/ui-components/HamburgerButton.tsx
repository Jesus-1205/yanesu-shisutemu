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
        relative w-10 h-[30px] bg-transparent cursor-pointer
        ${className}
      `}
      aria-label={open ? "Close menu" : "Open menu"}
      {...props}
    >
      <span
        className={`
          absolute left-0 block h-1 w-full bg-text-main rounded-full
          transition-all duration-250 ease-in-out origin-left
          ${open ? "top-0 rotate-45 left-[5px]" : "top-0"}
        `}
      />
      <span
        className={`
          absolute left-0 block h-1 bg-text-main rounded-full
          transition-all duration-250 ease-in-out
          ${open ? "top-1/2 w-0 opacity-0" : "top-1/2 w-full -translate-y-1/2"}
        `}
      />
      <span
        className={`
          absolute left-0 block h-1 w-full bg-text-main rounded-full
          transition-all duration-250 ease-in-out origin-left
          ${open ? "top-full -translate-y-full -rotate-45 left-[5px]" : "top-full -translate-y-full"}
        `}
      />
    </button>
  );
}
