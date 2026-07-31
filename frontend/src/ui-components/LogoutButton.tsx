import type { ButtonHTMLAttributes } from "react";
import { LogOut } from "lucide-react";

interface LogoutButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
}

export default function LogoutButton({
  label = "Logout",
  className = "",
  ...props
}: LogoutButtonProps) {
  return (
    <button
      className={`
        group flex items-center justify-start
        w-9 h-9 rounded-full
        bg-danger text-white
        border-none cursor-pointer relative
        overflow-hidden
        transition-all duration-300
        hover:w-[95px] hover:rounded-[30px]
        active:translate-x-0.5 active:translate-y-0.5
        ${className}
      `}
      {...props}
    >
      <span
        className="
          flex items-center justify-center
          w-full transition-all duration-300
          group-hover:w-[30%] group-hover:pl-4
        "
      >
        <LogOut size={14} />
      </span>
      <span
        className="
          absolute right-0 w-0 opacity-0
          text-white text-sm font-semibold
          transition-all duration-300
          group-hover:w-[70%] group-hover:opacity-100 group-hover:pr-2
        "
      >
        {label}
      </span>
    </button>
  );
}
