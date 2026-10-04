import LoginLeftPanel from "../components/LoginLeftPanel";
import LoginRightPanel from "../components/LoginRightPanel";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full">
      {/* Left panel — decorative */}
      <LoginLeftPanel />

      {/* Right panel — form */}
      <LoginRightPanel />
    </div>
  );
}
