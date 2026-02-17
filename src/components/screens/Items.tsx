import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabaseClient';
import {
  listItems,
  createItem,
  updateItem,
  deleteItem,
  type ItemRow,
} from '@/lib/items';
import { Pencil, Trash2 } from 'lucide-react';

export const ItemsScreen: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [formTitle, setFormTitle] = useState('');
  const [formValue, setFormValue] = useState<string>('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editValue, setEditValue] = useState<string>('');
  const [editLoading, setEditLoading] = useState(false);

  const fetchItems = async () => {
    const { data, error: err } = await listItems();
    if (err) {
      setError(err?.message ?? 'Failed to load items');
      setItems([]);
    } else {
      setError(null);
      setItems(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login', { replace: true });
        return;
      }
      setAuthChecked(true);
      fetchItems();
    });
  }, [navigate]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = formTitle.trim();
    if (!title) {
      setFormError('Title is required');
      return;
    }
    setFormError(null);
    setSubmitLoading(true);
    const value = formValue.trim() === '' ? null : Number(formValue);
    if (formValue.trim() !== '' && (value === undefined || Number.isNaN(value))) {
      setFormError('Value must be a number');
      setSubmitLoading(false);
      return;
    }
    const { data, error: err } = await createItem({ title, value: value ?? undefined });
    setSubmitLoading(false);
    if (err) {
      setFormError(err?.message ?? 'Failed to create item');
      return;
    }
    setFormTitle('');
    setFormValue('');
    if (data) setItems((prev) => [data, ...prev]);
  };

  const startEdit = (row: ItemRow) => {
    setEditingId(row.id);
    setEditTitle(row.title);
    setEditValue(row.value == null ? '' : String(row.value));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditValue('');
    setEditLoading(false);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const title = editTitle.trim();
    if (!title) return;
    setEditLoading(true);
    const value = editValue.trim() === '' ? null : Number(editValue);
    if (editValue.trim() !== '' && (value === undefined || Number.isNaN(value))) {
      setEditLoading(false);
      return;
    }
    const { data, error: err } = await updateItem(editingId, { title, value: value ?? undefined });
    setEditLoading(false);
    if (err) {
      setFormError(err?.message ?? 'Failed to update item');
      return;
    }
    if (data) {
      setItems((prev) => prev.map((i) => (i.id === data.id ? data : i)));
    }
    cancelEdit();
  };

  const handleDelete = async (id: string) => {
    const { error: err } = await deleteItem(id);
    if (err) {
      setError(err?.message ?? 'Failed to delete item');
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  if (!authChecked) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <p className="text-white/60">Checking auth…</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-white">Items</h1>
            <p className="text-white/60">Manage your items.</p>
          </div>
          <Button variant="secondary" onClick={() => supabase.auth.signOut().then(() => navigate('/login', { replace: true }))}>
            Sign out
          </Button>
        </div>

        <Card className="space-y-4 p-6">
          <h2 className="text-lg font-semibold text-white">Add item</h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <Input
              label="Title"
              placeholder="Item title"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              required
              disabled={submitLoading}
            />
            <Input
              label="Value (optional)"
              type="number"
              step="any"
              placeholder="0"
              value={formValue}
              onChange={(e) => setFormValue(e.target.value)}
              disabled={submitLoading}
            />
            {formError && (
              <p className="text-sm text-red-400">{formError}</p>
            )}
            <Button type="submit" disabled={submitLoading}>
              {submitLoading ? 'Adding…' : 'Add item'}
            </Button>
          </form>
        </Card>

        <Card className="space-y-4 p-6">
          <h2 className="text-lg font-semibold text-white">Your items</h2>
          {loading && (
            <p className="text-white/60">Loading…</p>
          )}
          {!loading && error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          {!loading && !error && items.length === 0 && (
            <p className="text-white/60">No items yet. Add one above.</p>
          )}
          {!loading && !error && items.length > 0 && (
            <ul className="space-y-2">
              {items.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4"
                >
                  {editingId === row.id ? (
                    <div className="flex-1 space-y-2">
                      <input
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Title"
                      />
                      <input
                        type="number"
                        step="any"
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        placeholder="Value"
                      />
                      <div className="flex gap-2">
                        <Button type="button" onClick={saveEdit} disabled={editLoading} className="!py-2">
                          {editLoading ? 'Saving…' : 'Save'}
                        </Button>
                        <Button type="button" variant="secondary" onClick={cancelEdit} className="!py-2">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="font-medium text-white">{row.title}</p>
                        <p className="text-sm text-white/60">
                          {row.value != null ? Number(row.value) : '—'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(row)}
                          className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white"
                          aria-label="Edit"
                        >
                          <Pencil className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row.id)}
                          className="rounded-lg p-2 text-white/60 hover:bg-red-500/20 hover:text-red-400"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </Layout>
  );
};
