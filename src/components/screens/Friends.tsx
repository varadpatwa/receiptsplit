import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { getFriends, addFriend, removeFriend, type StoredFriend } from '@/utils/friendsStorage';
import { generateId } from '@/utils/formatting';

export const FriendsScreen: React.FC = () => {
  const [friends, setFriends] = useState<StoredFriend[]>([]);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    setFriends(getFriends());
  }, []);

  const handleAdd = () => {
    if (!newName.trim()) return;
    const added = addFriend(newName.trim(), generateId);
    setFriends(getFriends());
    setNewName('');
  };

  const handleRemove = (id: string) => {
    removeFriend(id);
    setFriends(getFriends());
  };

  return (
    <Layout>
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
          {friends.length === 0 ? (
            <p className="py-6 text-center text-white/60">
              No friends yet. Add one above.
            </p>
          ) : (
            <div className="space-y-2">
              {friends.map(friend => (
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
    </Layout>
  );
};
