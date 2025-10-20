import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import { supabase } from '../lib/supabaseClient';

const defaultUserId = '00000000-0000-0000-0000-000000000000';

export default function SettingsPage() {
  const [weeklyBudget, setWeeklyBudget] = useState<number>(100);
  const [preferredStores, setPreferredStores] = useState<string[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: s } = await supabase.from('stores').select('*');
      if (s) setStores(s as any[]);
      const { data: us } = await supabase.from('user_settings').select('*').eq('user_id', defaultUserId).single().catch(() => ({ data: null }));
      if (us?.data) {
        setWeeklyBudget(Number(us.data.weekly_budget) || 100);
        setPreferredStores(us.data.preferred_stores || []);
      }
    }
    load();
  }, []);

  const save = async () => {
    setLoading(true);
    await supabase.from('user_settings').upsert({
      user_id: defaultUserId,
      weekly_budget: weeklyBudget,
      currency: 'USD',
      preferred_stores: preferredStores
    }, { returning: 'minimal' });
    setLoading(false);
    alert('Settings saved');
  };

  const toggleStore = (id: string) => {
    setPreferredStores((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  return (
    <div>
      <Header />
      <main style={{ padding: 16 }}>
        <h2>Settings</h2>
        <section style={{ marginBottom: 16 }}>
          <label>Weekly grocery budget (USD)</label>
          <div>
            <input type="number" value={weeklyBudget} onChange={(e) => setWeeklyBudget(Number(e.target.value))} />
          </div>
        </section>

        <section style={{ marginBottom: 16 }}>
          <h3>Preferred stores</h3>
          <div>
            {stores.map((s) => (
              <div key={s.id} style={{ marginBottom: 8 }}>
                <label>
                  <input type="checkbox" checked={preferredStores.includes(s.id)} onChange={() => toggleStore(s.id)} />{' '}
                  {s.name} — {s.address}
                </label>
              </div>
            ))}
          </div>
        </section>

        <button onClick={save} disabled={loading}>{loading ? 'Saving...' : 'Save Settings'}</button>
      </main>
    </div>
  );
}