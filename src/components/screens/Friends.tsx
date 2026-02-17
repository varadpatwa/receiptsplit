import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { listFriends, createFriend, deleteFriend, type Friend } from '@/lib/friends';
import { useAuthUserId } from '@/contexts/AuthContext';
import { migrateUserData } from '@/lib/migration';

function FriendsContent() {
  const userId = useAuthUserId();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadFriends = async () => {
      if (!userId) {
        setFriends([]);
        return;
      }
      
      setLoading(true);
      try {
        // Run migration if needed
        await migrateUserData(userId);
        
        // Load friends from Supabase
        const loaded = await listFriends();
        setFriends(loaded);
      } catch (e) {
        console.error('Failed to load friends:', e);
        setFriends([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadFriends();
  }, [userId]);

  const handleAdd = async () => {
    if (!newName.trim() || !userId) return;
    
    setLoading(true);
    try {
      await createFriend(newName.trim());
      const updated = await listFriends();
      setFriends(updated);
      setNewName('');
    } catch (e) {
      console.error('Failed to add friend:', e);
      // Reload to get current state
      try {
        const updated = await listFriends();
        setFriends(updated);
      } catch {
        // Ignore reload errors
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!userId) return;
    
    setLoading(true);
    try {
      await deleteFriend(id);
      const updated = await listFriends();
      setFriends(updated);
    } catch (e) {
      console.error('Failed to remove friend:', e);
      // Reload to get current state
      try {
        const updated = await listFriends();
        setFriends(updated);
      } catch {
        // Ignore reload errors
      }
    } finally {
      setLoading(false);
    }
  };

  const list = Array.isArray(friends) ? friends : [];

  return (
    <>
      <div className="space-y-6 pb-24">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Friends
          </h1>
          <p className="text-white/60">
            Add friends to quickly include them in splits.
          </p>
        </div>

        <Card className="space-y-4">
          <h3 className="font-semibold text-white">Add a friend</h3>
          <div className="flex gap-3">
            <Input
              placeholder="Friend's name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !loading && handleAdd()}
              disabled={loading || !userId}
              className="flex-1"
            />
            <Button onClick={handleAdd} disabled={!newName.trim() || loading || !userId}>
              <Plus className="h-5 w-5" />
            </Button>
          </div>
          {!userId && (
            <p className="text-sm text-white/60">
              Sign in to add friends
            </p>
          )}
        </Card>

        <Card className="space-y-4">
          <h3 className="font-semibold text-white">Saved friends</h3>
          {loading && list.length === 0 ? (
            <p className="py-6 text-center text-white/60">
              Loading...
            </p>
          ) : list.length === 0 ? (
            <p className="py-6 text-center text-white/60">
              {userId ? 'No friends yet. Add one above.' : 'Sign in to see your friends'}
            </p>
          ) : (
            <div className="space-y-2">
              {list.map(friend => (
                <div
                  key={friend.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4"
                >
                  <span className="font-medium text-white">{friend.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemove(friend.id)}
                    disabled={loading}
                    className="rounded-lg p-2 text-white/60 transition-colors hover:bg-red-500/20 hover:text-red-400 disabled:opacity-50"
                    aria-label={`Remove ${friend.name}`}
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

export const FriendsScreen: React.FC = () => {
  try {
    return (
      <Layout>
        <FriendsContent />
      </Layout>
    );
  } catch (error) {
    console.error('FriendsScreen error:', error);
    return (
      <Layout>
        <div className="space-y-6 pb-24">
          <h1 className="text-2xl font-semibold text-white">Friends</h1>
          <Card className="space-y-4 p-6">
            <p className="text-white/60">Something went wrong. Try refreshing the app.</p>
          </Card>
        </div>
      </Layout>
    );
  }
};
