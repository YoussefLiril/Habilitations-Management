import { Menu, LogOut, User, Moon, Sun, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItem {
  label: string;
  path: string;
  icon?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Tableau de Bord", path: "/home" },
  { label: "Employés HT", path: "/employees" },
  { label: "Employés ST", path: "/employees" },
  { label: "Renouvellement", path: "/renewals" },
  { label: "Calendrier", path: "/calendar" },
  { label: "Statistiques", path: "/stats" },
  { label: "Analyses", path: "/analytics" },
  { label: "Journal d'Audit", path: "/audit-log" },
  { label: "Paramètres", path: "/settings" },
];

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Initialize dark mode from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem("darkMode");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = savedMode ? JSON.parse(savedMode) : prefersDark;

    setIsDarkMode(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem("darkMode", JSON.stringify(newMode));

    if (newMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    navigate("/");
  };

  const isActiveTab = (path: string): boolean => {
    // For query params, just check the base path
    const basePath = path.split("?")[0];
    const currentBasePath = location.pathname;
    return currentBasePath === basePath;
  };

  const handleNavClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border shadow-sm">
        <div className="px-4 md:px-6 lg:px-8">
          {/* Desktop/Tablet Header */}
          <div className="flex items-center justify-between h-16">
            {/* Left: Logo */}
            <div className="flex-shrink-0">
              <Link to="/home" className="text-xl font-black text-foreground hover:text-primary transition-colors">
                Gestion Habilitations
              </Link>
            </div>

            {/* Center: Navigation Tabs (Desktop only) */}
            <nav className="hidden md:flex items-center gap-1 mx-auto">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "px-4 py-2.5 text-sm font-semibold transition-all duration-200 relative",
                    "text-foreground hover:bg-primary hover:text-primary-foreground rounded-xl",
                    isActiveTab(item.path) && "bg-primary text-primary-foreground shadow-md"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Right: Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleDarkMode}
                title={isDarkMode ? "Mode clair" : "Mode sombre"}
                className="rounded-xl"
              >
                {isDarkMode ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-xl">
                    <User className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile menu toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden rounded-xl"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {mobileMenuOpen && (
            <nav className="md:hidden flex flex-col gap-1 pb-4 border-t border-border pt-4">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={handleNavClick}
                  className={cn(
                    "px-4 py-3 text-sm font-semibold transition-all duration-200 rounded-xl",
                    "text-foreground hover:bg-primary hover:text-primary-foreground",
                    isActiveTab(item.path) && "bg-primary text-primary-foreground shadow-md"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </header>
    </>
  );
}
