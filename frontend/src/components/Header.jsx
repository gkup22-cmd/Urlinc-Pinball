import { Link, NavLink } from "react-router-dom";
import { CircleDot } from "lucide-react";

export const Header = () => (
  <header className="sticky top-0 z-30 border-b border-white/5 bg-[var(--bg)]/80 backdrop-blur-xl">
    <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-8">
      <Link to="/" className="flex items-center gap-2" data-testid="nav-home-link">
        <CircleDot className="h-6 w-6 text-[var(--magenta)]" />
        <span className="font-display text-lg font-black tracking-wider">PINBALL<span className="text-[var(--cyan)]">FORGE</span></span>
      </Link>
      <nav className="flex items-center gap-1 text-sm">
        <NavLink to="/" end className="nav-link" data-testid="nav-library-link">Tables</NavLink>
        <NavLink to="/brand" className="nav-link" data-testid="nav-brand-link">Brand Kit</NavLink>
      </nav>
    </div>
  </header>
);
