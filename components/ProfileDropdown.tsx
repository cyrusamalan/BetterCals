'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { UserCog, LogOut, ChevronDown } from 'lucide-react';
import { UserProfile } from '@/types';

interface ProfileDropdownProps {
  profile: UserProfile;
  onEditProfile: () => void;
}

export default function ProfileDropdown({ profile, onEditProfile }: ProfileDropdownProps) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { signOut } = useAuth();
  const { user } = useUser();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  const displayName = user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'User';
  const avatarUrl = user?.imageUrl;
  const initials = (user?.firstName?.[0] || user?.emailAddresses?.[0]?.emailAddress?.[0] || 'U').toUpperCase();

  const heightDisplay = `${profile.heightFeet}'${profile.heightInches}"`;
  const goalLabel = profile.goal === 'lose' ? 'Lose' : profile.goal === 'gain' ? 'Gain' : 'Maintain';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold btn-press transition-all"
        style={{
          background: open ? 'var(--accent-subtle)' : 'var(--border-light)',
          color: 'var(--text-primary)',
          border: `1px solid ${open ? 'rgba(107, 143, 113, 0.3)' : 'var(--border)'}`,
        }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="w-5 h-5 rounded-full object-cover"
          />
        ) : (
          <span
            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
            style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}
          >
            {initials}
          </span>
        )}
        <span className="hidden sm:inline">{displayName}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-64 rounded-2xl p-4 z-50 anim-fade-up"
          style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid var(--border)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          }}
        >
          {/* User info */}
          <div className="flex items-center gap-3 mb-3">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <span
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}
              >
                {initials}
              </span>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                {user?.emailAddresses?.[0]?.emailAddress}
              </p>
            </div>
          </div>

          {/* Profile summary */}
          <div
            className="rounded-xl p-3 mb-3"
            style={{ background: 'var(--accent-subtle)', border: '1px solid rgba(107, 143, 113, 0.1)' }}
          >
            <p className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: 'var(--accent)' }}>
              Profile
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span>Age: <strong style={{ color: 'var(--text-primary)' }}>{profile.age}</strong></span>
              <span>Gender: <strong style={{ color: 'var(--text-primary)' }}>{profile.gender === 'male' ? 'M' : 'F'}</strong></span>
              <span>Height: <strong style={{ color: 'var(--text-primary)' }}>{heightDisplay}</strong></span>
              <span>Weight: <strong style={{ color: 'var(--text-primary)' }}>{profile.weightLbs} lbs</strong></span>
              <span>Activity: <strong style={{ color: 'var(--text-primary)' }}>{profile.activityLevel}</strong></span>
              <span>Goal: <strong style={{ color: 'var(--text-primary)' }}>{goalLabel}</strong></span>
            </div>
          </div>

          {/* Actions */}
          <button
            type="button"
            onClick={() => { setOpen(false); onEditProfile(); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold btn-press mb-1.5 transition-colors"
            style={{ color: 'var(--accent)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-subtle)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <UserCog className="w-3.5 h-3.5" />
            Edit Profile
          </button>

          <div className="border-t my-1.5" style={{ borderColor: 'var(--border)' }} />

          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold btn-press transition-colors disabled:opacity-50"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--border-light)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <LogOut className="w-3.5 h-3.5" />
            {signingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  );
}
