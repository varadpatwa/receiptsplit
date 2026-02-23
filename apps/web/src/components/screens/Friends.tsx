import React, { useState, useEffect } from 'react';
import { Plus, Trash2, UserPlus, Check, X } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { listFriends, deleteFriend, type Friend } from '@/lib/friends';
import { 
  getIncomingRequests, 
  getOutgoingRequests, 
  sendFriendRequest, 
  acceptFriendRequest, 
  rejectFriendRequest,
  type FriendRequest 
} from '@/lib/friendRequests';
import { searchProfilesByHandle } from '@/lib/profiles';
import { useAuthUserId } from '@/contexts/AuthContext';

function FriendsContent() {
  const userId = useAuthUserId();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: string; handle: string; display_name: string | null }>>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  const loadData = async () => {
    if (!userId) {
      setFriends([]);
      setIncomingRequests([]);
      setOutgoingRequests([]);
      return;
    }
    
    setLoading(true);
    try {
      const [friendsData, incoming, outgoing] = await Promise.all([
        listFriends(),
        getIncomingRequests(),
        getOutgoingRequests(),
      ]);
      setFriends(friendsData);
      setIncomingRequests(incoming);
      setOutgoingRequests(outgoing);
    } catch (e) {
      console.error('Failed to load friends data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  // Search profiles by handle
  useEffect(() => {
    const search = async () => {
      if (!searchQuery.trim() || !userId) {
        setSearchResults([]);
        return;
      }

      setSearching(true);
      try {
        const results = await searchProfilesByHandle(searchQuery, 10);
        setSearchResults(results);
      } catch (e) {
        console.error('Failed to search profiles:', e);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    };

    const timeoutId = setTimeout(search, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, userId]);

  const handleSendRequest = async (toUserId: string) => {
    if (!userId) return;
    
    setLoading(true);
    try {
      await sendFriendRequest(toUserId);
      await loadData(); // Reload to update outgoing requests
      setSearchQuery(''); // Clear search
    } catch (e) {
      console.error('Failed to send friend request:', e);
      alert(e instanceof Error ? e.message : 'Failed to send request');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    if (!userId) return;
    
    setLoading(true);
    try {
      await acceptFriendRequest(requestId);
      await loadData(); // Reload to update friends and requests
    } catch (e) {
      console.error('Failed to accept request:', e);
      alert(e instanceof Error ? e.message : 'Failed to accept request');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    if (!userId) return;
    
    setLoading(true);
    try {
      await rejectFriendRequest(requestId);
      await loadData(); // Reload to update requests
    } catch (e) {
      console.error('Failed to reject request:', e);
      alert(e instanceof Error ? e.message : 'Failed to reject request');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!userId) return;
    
    setLoading(true);
    try {
      await deleteFriend(friendId);
      await loadData();
    } catch (e) {
      console.error('Failed to remove friend:', e);
      alert(e instanceof Error ? e.message : 'Failed to remove friend');
    } finally {
      setLoading(false);
    }
  };

  const isAlreadyFriend = (userId: string) => {
    return friends.some(f => f.id === userId);
  };

  const hasOutgoingRequest = (userId: string) => {
    return outgoingRequests.some(r => r.to_user_id === userId);
  };

  return (
    <>
      <div className="space-y-6 pb-24">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Friends
          </h1>
          <p className="text-white/60">
            Find and connect with friends by handle.
          </p>
        </div>

        {/* Search for friends */}
        <Card className="space-y-4">
          <h3 className="font-semibold text-white">Find friends</h3>
          <Input
            placeholder="Search by handle (e.g., @username)"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            disabled={loading || !userId}
            className="font-mono"
          />
          {searching && (
            <p className="text-sm text-white/60">Searching...</p>
          )}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map(profile => {
                const isFriend = isAlreadyFriend(profile.id);
                const hasRequest = hasOutgoingRequest(profile.id);
                return (
                  <div
                    key={profile.id}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4"
                  >
                    <div>
                      <p className="font-medium text-white font-mono">@{profile.handle}</p>
                      {profile.display_name && (
                        <p className="text-sm text-white/60">{profile.display_name}</p>
                      )}
                    </div>
                    {isFriend ? (
                      <span className="text-sm text-white/60">Already friends</span>
                    ) : hasRequest ? (
                      <span className="text-sm text-white/60">Request sent</span>
                    ) : (
                      <Button
                        onClick={() => handleSendRequest(profile.id)}
                        disabled={loading}
                        variant="secondary"
                        className="text-sm"
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Send request
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {!userId && (
            <p className="text-sm text-white/60">
              Sign in to search for friends
            </p>
          )}
        </Card>

        {/* Incoming requests */}
        {incomingRequests.length > 0 && (
          <Card className="space-y-4">
            <h3 className="font-semibold text-white">Friend Requests</h3>
            <div className="space-y-2">
              {incomingRequests.map(request => (
                <div
                  key={request.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4"
                >
                  <div>
                    <p className="font-medium text-white font-mono">
                      @{request.from_profile?.handle || 'unknown'}
                    </p>
                    {request.from_profile?.display_name && (
                      <p className="text-sm text-white/60">
                        {request.from_profile.display_name}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleAcceptRequest(request.id)}
                      disabled={loading}
                      variant="secondary"
                      className="text-sm"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => handleRejectRequest(request.id)}
                      disabled={loading}
                      variant="secondary"
                      className="text-sm"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Outgoing requests */}
        {outgoingRequests.length > 0 && (
          <Card className="space-y-4">
            <h3 className="font-semibold text-white">Sent Requests</h3>
            <div className="space-y-2">
              {outgoingRequests.map(request => (
                <div
                  key={request.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4"
                >
                  <div>
                    <p className="font-medium text-white font-mono">
                      @{request.to_profile?.handle || 'unknown'}
                    </p>
                    {request.to_profile?.display_name && (
                      <p className="text-sm text-white/60">
                        {request.to_profile.display_name}
                      </p>
                    )}
                  </div>
                  <span className="text-sm text-white/60">Pending</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Friends list */}
        <Card className="space-y-4">
          <h3 className="font-semibold text-white">Friends</h3>
          {loading && friends.length === 0 ? (
            <p className="py-6 text-center text-white/60">
              Loading...
            </p>
          ) : friends.length === 0 ? (
            <p className="py-6 text-center text-white/60">
              {userId ? 'No friends yet. Search above to find friends.' : 'Sign in to see your friends'}
            </p>
          ) : (
            <div className="space-y-2">
              {friends.map(friend => (
                <div
                  key={friend.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4"
                >
                  <div>
                    <p className="font-medium text-white font-mono">@{friend.handle}</p>
                    {friend.display_name && (
                      <p className="text-sm text-white/60">{friend.display_name}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFriend(friend.id)}
                    disabled={loading}
                    className="rounded-lg p-2 text-white/60 transition-colors hover:bg-red-500/20 hover:text-red-400 disabled:opacity-50"
                    aria-label={`Remove ${friend.handle}`}
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
