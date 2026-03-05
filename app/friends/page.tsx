'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface FriendUser {
  id: string;
  name?: string | null;
  email: string;
}

interface FriendEntry {
  id: string;
  createdAt: string;
  user: FriendUser;
}

export default function FriendsPage() {
  const router = useRouter();
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [pendingReceived, setPendingReceived] = useState<FriendEntry[]>([]);
  const [pendingSent, setPendingSent] = useState<FriendEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetEmail, setTargetEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [sendStatus, setSendStatus] = useState('');
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');

  const fetchFriends = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/friends');
      if (!res.ok) { router.push('/login'); return; }
      const data = await res.json();
      setFriends(data.friends);
      setPendingReceived(data.pendingReceived);
      setPendingSent(data.pendingSent);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchFriends(); }, [fetchFriends]);

  const sendRequest = async () => {
    if (!targetEmail.trim()) return;
    setSearching(true);
    setSendStatus('');
    try {
      // Look up user by email via a simple search
      const usersRes = await fetch(`/api/user/search?q=${encodeURIComponent(targetEmail)}`);
      if (!usersRes.ok) { setSendStatus('User not found.'); return; }
      const { users } = await usersRes.json();
      if (!users || users.length === 0) { setSendStatus('No user found with that email.'); return; }
      const target = users[0];

      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: target.id }),
      });
      const data = await res.json();
      if (!res.ok) { setSendStatus(data.error || 'Failed to send request.'); return; }
      setSendStatus(`✅ ${data.message}`);
      setTargetEmail('');
      fetchFriends();
    } finally {
      setSearching(false);
    }
  };

  const handleAccept = async (requestId: string) => {
    await fetch('/api/friends/accept', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, action: 'ACCEPT' }),
    });
    fetchFriends();
  };

  const handleDecline = async (requestId: string) => {
    await fetch('/api/friends/accept', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, action: 'DECLINE' }),
    });
    fetchFriends();
  };

  const handleRemove = async (friendUserId: string) => {
    if (!confirm('Remove this friend?')) return;
    await fetch(`/api/friends/${friendUserId}`, { method: 'DELETE' });
    fetchFriends();
  };

  const totalRequests = pendingReceived.length;

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-stone-900">Friends</h1>
          <p className="mt-1 text-sm text-stone-500">
            Manage your connections and control who sees your private trip media.
          </p>
        </div>

        {/* Send Friend Request */}
        <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-stone-400">
            Add Friend
          </h2>
          <div className="flex gap-3">
            <input
              type="email"
              value={targetEmail}
              onChange={(e) => setTargetEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendRequest()}
              placeholder="Enter friend's email address"
              className="flex-1 rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
            />
            <button
              onClick={sendRequest}
              disabled={searching || !targetEmail.trim()}
              className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
            >
              {searching ? 'Sending...' : 'Send Request'}
            </button>
          </div>
          {sendStatus && (
            <p className="mt-3 text-sm text-stone-600">{sendStatus}</p>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-xl border border-stone-200 bg-white p-1">
          {(['friends', 'requests'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {tab === 'requests' ? (
                <span className="flex items-center justify-center gap-2">
                  Requests
                  {totalRequests > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                      {totalRequests}
                    </span>
                  )}
                </span>
              ) : (
                <span>Friends ({friends.length})</span>
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-200 border-t-amber-500" />
            </div>
          ) : activeTab === 'friends' ? (
            <motion.div key="friends" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {friends.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-stone-200 p-12 text-center text-stone-400">
                  <p className="text-sm">No friends yet. Send a request to connect!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {friends.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700 font-bold text-sm">
                          {(f.user.name || f.user.email)[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-stone-800">{f.user.name || 'Unnamed User'}</p>
                          <p className="text-xs text-stone-400">{f.user.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemove(f.user.id)}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 border border-red-100 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="requests" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              {/* Received requests */}
              {pendingReceived.length > 0 && (
                <div>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-stone-400">
                    Received Requests
                  </h3>
                  <div className="space-y-3">
                    {pendingReceived.map((r) => (
                      <div key={r.id} className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-stone-600 font-bold text-sm">
                            {(r.user.name || r.user.email)[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-stone-800">{r.user.name || 'Unnamed User'}</p>
                            <p className="text-xs text-stone-400">{r.user.email}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDecline(r.id)}
                            className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50"
                          >
                            Decline
                          </button>
                          <button
                            onClick={() => handleAccept(r.id)}
                            className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
                          >
                            Accept
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sent requests */}
              {pendingSent.length > 0 && (
                <div>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-stone-400">
                    Sent Requests
                  </h3>
                  <div className="space-y-3">
                    {pendingSent.map((r) => (
                      <div key={r.id} className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-stone-500 font-bold text-sm">
                            {(r.user.name || r.user.email)[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-stone-800">{r.user.name || 'Unnamed User'}</p>
                            <p className="text-xs text-stone-400">{r.user.email}</p>
                          </div>
                        </div>
                        <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
                          Pending
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pendingReceived.length === 0 && pendingSent.length === 0 && (
                <div className="rounded-2xl border border-dashed border-stone-200 p-12 text-center text-stone-400">
                  <p className="text-sm">No pending friend requests.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
