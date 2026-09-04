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
        group relative flex size-9
        cursor-pointer items-center justify-start
        overflow-hidden rounded-full
        border-none bg-danger text-white
        transition-all
        duration-300 hover:w-[95px]
        hover:rounded-[30px] active:translate-0.5
        ${className}
      `}
      {...props}
    >
      <span
        className="
          flex w-full items-center
          justify-center transition-all duration-300
          group-hover:w-[30%] group-hover:pl-4
        "
      >
        <LogOut size={14} />
      </span>
      <span
        className="
          absolute right-0 w-0 text-sm
          font-semibold text-white opacity-0
          transition-all duration-300
          group-hover:w-[70%] group-hover:pr-2 group-hover:opacity-100
        "
      >
        {label}
      </span>
    </button>
  );
}
