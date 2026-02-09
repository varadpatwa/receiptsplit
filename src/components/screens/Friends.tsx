import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { getFriends, addFriend, removeFriend, type Friend } from '@/utils/friends';

function FriendsContent() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    try {
      setFriends(getFriends());
    } catch (e) {
      setFriends([]);
    }
  }, []);

  const handleAdd = () => {
    if (!newName.trim()) return;
    try {
      addFriend(newName.trim());
      setFriends(getFriends());
      setNewName('');
    } catch (e) {
      setFriends(getFriends());
    }
  };

  const handleRemove = (id: string) => {
    try {
      removeFriend(id);
      setFriends(getFriends());
    } catch (e) {
      setFriends(getFriends());
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
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              className="flex-1"
            />
            <Button onClick={handleAdd} disabled={!newName.trim()}>
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </Card>

        <Card className="space-y-4">
          <h3 className="font-semibold text-white">Saved friends</h3>
          {list.length === 0 ? (
            <p className="py-6 text-center text-white/60">
              No friends yet. Add one above.
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
                    className="rounded-lg p-2 text-white/60 transition-colors hover:bg-red-500/20 hover:text-red-400"
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
