import { useAuth } from "@/contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, User, Wrench, Shield, Zap } from "lucide-react";

const Navbar = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getDashboardLink = () => {
    if (!profile) return "/";
    switch (profile.role) {
      case "helper": return "/helper";
      case "admin": return "/admin";
      default: return "/dashboard";
    }
  };

  const getRoleIcon = () => {
    if (!profile) return null;
    switch (profile.role) {
      case "helper": return <Wrench className="h-4 w-4" />;
      case "admin": return <Shield className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-hero">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground">SmartHelper</span>
        </Link>

        <div className="flex items-center gap-3">
          {user && profile ? (
            <>
              <Link to={getDashboardLink()}>
                <Button variant="ghost" size="sm" className="gap-2">
                  {getRoleIcon()}
                  <span className="hidden sm:inline">{profile.full_name || profile.role}</span>
                </Button>
              </Link>
              <Button variant="ghost" size="icon" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Link to="/auth">
                <Button variant="ghost" size="sm">Log in</Button>
              </Link>
              <Link to="/auth?tab=signup">
                <Button size="sm">Sign up</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
