'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { AlertTriangle, Check, Unlink2 } from 'lucide-react';

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

type Status = { kind: 'success' | 'error'; message: string } | null;

function SectionCard({
  title,
  description,
  children,
  tone = 'default',
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  tone?: 'default' | 'danger';
}) {
  const borderColor = tone === 'danger' ? 'var(--status-danger-border)' : 'var(--card-border)';
  return (
    <div
      className="rounded-2xl p-6 mb-5"
      style={{
        background: 'var(--card-bg)',
        backdropFilter: 'blur(24px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
        border: `1px solid ${borderColor}`,
        boxShadow: 'var(--card-shadow)',
      }}
    >
      <h2
        className="font-display text-lg leading-tight mb-1"
        style={{ color: tone === 'danger' ? 'var(--status-danger)' : 'var(--text-primary)' }}
      >
        {title}
      </h2>
      {description && (
        <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
          {description}
        </p>
      )}
      {children}
    </div>
  );
}

function StatusBanner({ status }: { status: Status }) {
  if (!status) return null;
  const isError = status.kind === 'error';
  return (
    <div
      className="text-xs font-medium px-3.5 py-2.5 rounded-xl flex items-center gap-2"
      style={{
        color: isError ? 'var(--status-danger)' : 'var(--accent)',
        backgroundColor: isError ? 'var(--status-danger-bg)' : 'var(--accent-subtle)',
        border: `1px solid ${isError ? 'var(--status-danger-border)' : 'rgba(107, 143, 113, 0.25)'}`,
      }}
    >
      {isError ? (
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
      ) : (
        <Check className="w-3.5 h-3.5 flex-shrink-0" />
      )}
      {status.message}
    </div>
  );
}

function clerkErrorMessage(err: unknown, fallback: string): string {
  const clerkError = err as { errors?: { longMessage?: string; message?: string }[] };
  return clerkError.errors?.[0]?.longMessage || clerkError.errors?.[0]?.message || fallback;
}

export default function AccountSettingsPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();

  const [username, setUsername] = useState('');
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<Status>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<Status>(null);

  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [connectionsStatus, setConnectionsStatus] = useState<Status>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTypedValue, setDeleteTypedValue] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<Status>(null);

  useEffect(() => {
    if (user?.username) setUsername(user.username);
  }, [user?.username]);

  const externalAccounts = useMemo(() => user?.externalAccounts ?? [], [user?.externalAccounts]);
  const hasPassword = user?.passwordEnabled ?? false;
  const onlyAuthMethod = !hasPassword && externalAccounts.length <= 1;

  if (!isLoaded || !user) return null;

  const primaryEmail = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? '';

  const handleSaveUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = username.trim().toLowerCase();
    if (!USERNAME_PATTERN.test(normalized)) {
      setUsernameStatus({ kind: 'error', message: 'Username must be 3-20 chars, lowercase letters, numbers, or underscores.' });
      return;
    }
    if (normalized === user.username) {
      setUsernameStatus({ kind: 'success', message: 'That is already your username.' });
      return;
    }
    setUsernameSaving(true);
    setUsernameStatus(null);
    try {
      await user.update({ username: normalized });
      setUsernameStatus({ kind: 'success', message: 'Username updated.' });
    } catch (err) {
      setUsernameStatus({ kind: 'error', message: clerkErrorMessage(err, 'Could not update username.') });
    } finally {
      setUsernameSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setPasswordStatus({ kind: 'error', message: 'New password must be at least 8 characters.' });
      return;
    }
    setPasswordSaving(true);
    setPasswordStatus(null);
    try {
      await user.updatePassword({ currentPassword, newPassword, signOutOfOtherSessions: true });
      setPasswordStatus({ kind: 'success', message: 'Password updated. Other sessions have been signed out.' });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setPasswordStatus({ kind: 'error', message: clerkErrorMessage(err, 'Could not update password.') });
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleUnlink = async (accountId: string) => {
    if (onlyAuthMethod) return;
    setUnlinkingId(accountId);
    setConnectionsStatus(null);
    try {
      const account = externalAccounts.find((a) => a.id === accountId);
      if (!account) throw new Error('Account not found');
      await account.destroy();
      await user.reload();
      setConnectionsStatus({ kind: 'success', message: 'Account unlinked.' });
    } catch (err) {
      setConnectionsStatus({ kind: 'error', message: clerkErrorMessage(err, 'Could not unlink account.') });
    } finally {
      setUnlinkingId(null);
    }
  };

  const handleDelete = async () => {
    const typed = deleteTypedValue.trim().toLowerCase();
    const expected = (user.username ?? primaryEmail ?? '').toLowerCase();
    if (!expected || typed !== expected) {
      setDeleteStatus({ kind: 'error', message: `Type "${expected}" to confirm.` });
      return;
    }
    setDeleting(true);
    setDeleteStatus(null);
    try {
      await user.delete();
      router.replace('/');
    } catch (err) {
      setDeleteStatus({ kind: 'error', message: clerkErrorMessage(err, 'Could not delete account.') });
      setDeleting(false);
    }
  };

  const deleteConfirmLabel = user.username ?? primaryEmail;

  return (
    <div>
      {/* Username */}
      <SectionCard title="Username" description="Visible to you across BetterCals.">
        <form onSubmit={handleSaveUsername} className="space-y-3">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="auth-input"
            placeholder="health_hustler"
            autoComplete="username"
          />
          <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
            3-20 chars, lowercase letters, numbers, underscores.
          </p>
          <StatusBanner status={usernameStatus} />
          <button
            type="submit"
            disabled={usernameSaving}
            className="auth-btn-primary"
            style={{ width: 'auto', minWidth: '140px' }}
          >
            {usernameSaving ? 'Saving...' : 'Save username'}
          </button>
        </form>
      </SectionCard>

      {/* Email (read-only) */}
      <SectionCard title="Email" description="Primary email on your account.">
        <div
          className="rounded-xl px-3.5 py-2.5 text-sm"
          style={{ background: 'var(--border-light)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
        >
          {primaryEmail}
        </div>
      </SectionCard>

      {/* Password */}
      {hasPassword ? (
        <SectionCard title="Password" description="Change your password. Other active sessions will be signed out.">
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Current password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="auth-input"
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                New password
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="auth-input"
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
            </div>
            <StatusBanner status={passwordStatus} />
            <button
              type="submit"
              disabled={passwordSaving}
              className="auth-btn-primary"
              style={{ width: 'auto', minWidth: '160px' }}
            >
              {passwordSaving ? 'Updating...' : 'Update password'}
            </button>
          </form>
        </SectionCard>
      ) : (
        <SectionCard title="Password" description="You signed in with a social provider and do not have a password set.">
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Support for setting a password from settings is coming soon.
          </p>
        </SectionCard>
      )}

      {/* Connected accounts */}
      <SectionCard title="Connected accounts" description="Sign in methods linked to your account.">
        {externalAccounts.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            No connected accounts yet.
          </p>
        ) : (
          <div className="space-y-2">
            {externalAccounts.map((account) => {
              const providerLabel = account.provider
                .replace(/^oauth_/, '')
                .replace(/\b\w/g, (c) => c.toUpperCase());
              const isUnlinking = unlinkingId === account.id;
              return (
                <div
                  key={account.id}
                  className="flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5"
                  style={{ background: 'var(--border-light)', border: '1px solid var(--border)' }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {providerLabel}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                      {account.emailAddress}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUnlink(account.id)}
                    disabled={isUnlinking || onlyAuthMethod}
                    title={onlyAuthMethod ? 'Cannot unlink your only sign-in method.' : undefined}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold btn-press transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      color: 'var(--status-danger)',
                      background: 'var(--status-danger-bg)',
                      border: '1px solid var(--status-danger-border)',
                    }}
                  >
                    <Unlink2 className="w-3.5 h-3.5" />
                    {isUnlinking ? 'Unlinking...' : 'Unlink'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-3">
          <StatusBanner status={connectionsStatus} />
        </div>
      </SectionCard>

      {/* Danger zone */}
      <SectionCard
        tone="danger"
        title="Danger zone"
        description="Permanently delete your account and all saved analyses. This cannot be undone."
      >
        {!deleteConfirmOpen ? (
          <button
            type="button"
            onClick={() => { setDeleteConfirmOpen(true); setDeleteStatus(null); }}
            className="px-4 py-2 rounded-xl text-sm font-semibold btn-press transition-colors"
            style={{
              color: 'var(--status-danger)',
              background: 'var(--status-danger-bg)',
              border: '1px solid var(--status-danger-border)',
            }}
          >
            Delete my account
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
              Type <strong>{deleteConfirmLabel}</strong> to confirm.
            </p>
            <input
              type="text"
              value={deleteTypedValue}
              onChange={(e) => setDeleteTypedValue(e.target.value)}
              className="auth-input"
              placeholder={deleteConfirmLabel}
              autoFocus
            />
            <StatusBanner status={deleteStatus} />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-sm font-semibold btn-press transition-colors disabled:opacity-50"
                style={{
                  color: 'var(--text-inverse)',
                  background: 'var(--status-danger)',
                  border: '1px solid var(--status-danger)',
                }}
              >
                {deleting ? 'Deleting...' : 'Delete forever'}
              </button>
              <button
                type="button"
                onClick={() => { setDeleteConfirmOpen(false); setDeleteTypedValue(''); setDeleteStatus(null); }}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-sm font-semibold btn-press transition-colors"
                style={{
                  color: 'var(--text-secondary)',
                  background: 'var(--border-light)',
                  border: '1px solid var(--border)',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
