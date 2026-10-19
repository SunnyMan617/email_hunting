import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export default function DatabaseStatus() {
  const [status, setStatus] = useState(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    setStatus(null);
    async function check() {
      try {
        const [profiles, contacts] = await Promise.all([
          supabase.from('profiles').select('id, link, email, contact_id, updated_at').limit(0),
          supabase.from('contacts').select('id').limit(0),
        ]);
        if (cancelled) return;
        const blocked = code => ['42501', 'PGRST301'].includes(code);
        if (profiles.error?.code === 'PGRST205') setStatus('missing');
        else if ((profiles.error && !blocked(profiles.error.code)) || contacts.error?.code === 'PGRST205' || (contacts.error && !blocked(contacts.error.code))) setStatus('update');
      } catch { if (!cancelled) setStatus('unavailable'); }
    }
    check();
    return () => { cancelled = true; };
  }, [attempt]);

  if (!status) return null;
  const editor = `${import.meta.env.VITE_SUPABASE_URL.replace('.supabase.co', '').replace('https://', 'https://supabase.com/dashboard/project/')}/sql/new`;
  return <div className="setup" role="status">
    <strong>{status === 'missing' ? 'One more step: create your profile table.' : status === 'update' ? 'Your database needs the contacts update.' : 'Unable to reach your profile database.'}</strong>
    {status === 'missing' && <span>In the Supabase SQL editor, run <code>supabase/migrations/202610180001_profiles.sql</code> and then <code>supabase/migrations/202610190001_contacts.sql</code>.</span>}
    {status === 'update' && <span>In the Supabase SQL editor, run <code>supabase/migrations/202610190001_contacts.sql</code>. This adds your contacts and the new profile fields.</span>}
    {status === 'unavailable' && <span>Check your connection and Supabase project settings, then try again.</span>}
    {status !== 'unavailable' && <a className="text-button" href={editor} target="_blank" rel="noreferrer">Open Supabase SQL Editor ↗</a>}
    <button className="text-button" onClick={() => setAttempt(value => value + 1)}>Check database again</button>
  </div>;
}
