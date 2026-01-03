import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Heart, User, LogOut, Plus, MessageCircle, Menu, X } from 'lucide-react';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export function Navbar() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isNgo = profile?.role === 'ngo';

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold text-primary">
          <Heart className="h-6 w-6 fill-primary" />
          <span>DonateLocal</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          {user ? (
            <>
              <Link to="/feed" className="text-muted-foreground hover:text-foreground transition-colors">
                Feed
              </Link>
              <Link to="/messages" className="relative text-muted-foreground hover:text-foreground transition-colors">
                <MessageCircle className="h-5 w-5" />
              </Link>
              
              <Button onClick={() => navigate(isNgo ? '/create-request' : '/create-listing')} size="sm">
                <Plus className="h-4 w-4" />
                {isNgo ? 'New Request' : 'Donate'}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 outline-none">
                    <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {profile?.username?.[0]?.toUpperCase() || profile?.organization_name?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    {isNgo && profile?.is_verified && (
                      <Badge variant="secondary" className="text-xs bg-verified/10 text-verified">
                        Verified
                      </Badge>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="font-medium">{profile?.username || profile?.organization_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{profile?.role} Account</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/my-listings')}>
                    My {isNgo ? 'Requests' : 'Listings'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link to="/auth" className="text-muted-foreground hover:text-foreground transition-colors">
                Sign In
              </Link>
              <Button onClick={() => navigate('/auth?mode=signup')}>
                Get Started
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background p-4 animate-slide-up">
          {user ? (
            <div className="space-y-4">
              <Link to="/feed" className="block py-2 text-foreground" onClick={() => setMobileMenuOpen(false)}>
                Feed
              </Link>
              <Link to="/messages" className="block py-2 text-foreground" onClick={() => setMobileMenuOpen(false)}>
                Messages
              </Link>
              <Link to="/profile" className="block py-2 text-foreground" onClick={() => setMobileMenuOpen(false)}>
                Profile
              </Link>
              <Link to="/my-listings" className="block py-2 text-foreground" onClick={() => setMobileMenuOpen(false)}>
                My {isNgo ? 'Requests' : 'Listings'}
              </Link>
              <Button 
                className="w-full" 
                onClick={() => {
                  navigate(isNgo ? '/create-request' : '/create-listing');
                  setMobileMenuOpen(false);
                }}
              >
                <Plus className="h-4 w-4" />
                {isNgo ? 'New Request' : 'Donate Item'}
              </Button>
              <Button variant="outline" className="w-full" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Button variant="outline" className="w-full" onClick={() => { navigate('/auth'); setMobileMenuOpen(false); }}>
                Sign In
              </Button>
              <Button className="w-full" onClick={() => { navigate('/auth?mode=signup'); setMobileMenuOpen(false); }}>
                Get Started
              </Button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
