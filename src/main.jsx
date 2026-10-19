import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Users, Search, Plus, ArrowUpRight, Pencil, Trash2, X, ChevronLeft, ChevronRight, LayoutGrid, LogOut, Leaf, RefreshCw, Contact } from 'lucide-react';
import { supabase } from './supabase';
import './style.css';
import './directory.css';
import ProfileDetails from './ProfileDetails';
import DirectoryOptions from './DirectoryOptions';
import DatabaseStatus from './DatabaseStatus';

const emptyProfile = { name: '', country: '', email: '', link: '', additional_link: '', status: 'Found', telegram: '', whatsapp: '', discord: '', contact_id: '', note: '' };
const emptyContact = { name: '', email: '', telegram: '', whatsapp: '', discord: '' };
const statuses = ['Found', 'Sent', 'Responded', 'Interview', 'Failed', 'Succeeded'];
const profileColumns = ['No.', 'Name', 'Country', 'Email', 'Link', 'Status', 'My contact', 'Created', 'Updated', 'Actions'];
const avatarTones = ['#e4f2ea', '#f4ece4', '#e7eef6', '#f3e9f1'];

function Blank() { return <span className="muted">—</span>; }
function formatWhen(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || '?';
}
function optionalEmail(value) {
  if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error('Enter a valid email address.');
}
function requiredEmail(value) {
  if (!value) throw new Error('Please enter an email address.');
  optionalEmail(value);
}
function optionalLink(value) {
  if (!value) return;
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Links must start with https:// or http://.');
}
function ExternalLink({ value }) {
  if (!value) return <Blank/>;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return <span>Invalid link</span>;
    return <a className="external" href={url.href} target="_blank" rel="noreferrer">{url.hostname.replace(/^www\./, '')}<ArrowUpRight size={13}/></a>;
  } catch { return <span>Invalid link</span>; }
}

function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(!supabase);
  const [authMode, setAuthMode] = useState('signin');
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [rows, setRows] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [count, setCount] = useState(0);
  const [stats, setStats] = useState({ total: 0, succeeded: 0, contacts: 0 });
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All statuses');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [country, setCountry] = useState('');
  const [sort, setSort] = useState('newest');
  const [screen, setScreen] = useState('people');
  const [viewing, setViewing] = useState(null);
  const changeCountry = useCallback(value => { setCountry(value); setPage(1); }, []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [contactEditing, setContactEditing] = useState(null);
  const [contactDeleting, setContactDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!session) {
      setViewing(null);
      setEditing(null);
      setDeleting(null);
      setContactEditing(null);
      setContactDeleting(null);
      setNotice('');
      setContacts([]);
    }
  }, [session]);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data, error: authError }) => { if (authError) setError(authError.message); setSession(data.session); setAuthReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); setAuthReady(true); setPage(1); setRows([]); setCount(0); setContacts([]); setStats({ total: 0, succeeded: 0, contacts: 0 }); });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => { const timer = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 300); return () => clearTimeout(timer); }, [search]);
  useEffect(() => {
    if (!session || !supabase) return;
    let cancelled = false;
    async function load() {
      setLoading(true); setError('');
      const orderColumn = sort.startsWith('name-') ? 'name' : 'created_at';
      const ascending = sort === 'name-asc' || sort === 'oldest';
      let request = supabase.from('profiles').select('*, contact:contacts!contact_id(id, name, email, telegram, whatsapp, discord)', { count: 'exact' }).order(orderColumn, { ascending }).order('id');
      if (country) request = request.ilike('country', `%${country.replace(/[\\%_]/g, '\\$&')}%`);
      if (query) {
        const term = `%${query.replace(/[\\%_]/g, '\\$&')}%`;
        request = request.or(`name.ilike.${term},email.ilike.${term}`);
      }
      if (status !== 'All statuses') request = request.eq('status', status);
      try {
        const [result, total, succeeded, contactList] = await Promise.all([
          request.range((page - 1) * size, page * size - 1),
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'Succeeded'),
          supabase.from('contacts').select('*', { count: 'exact' }).order('name').order('id'),
        ]);
        if (cancelled) return;
        for (const response of [result, total, succeeded, contactList]) if (response.error) throw response.error;
        const lastPage = Math.max(1, Math.ceil(result.count / size));
        if (page > lastPage) { setPage(lastPage); return; }
        setRows(result.data); setCount(result.count); setContacts(contactList.data); setStats({ total: total.count, succeeded: succeeded.count, contacts: contactList.count });
      } catch (loadError) { if (!cancelled) { setRows([]); setCount(0); setContacts([]); setError(loadError.message); } } finally { if (!cancelled) setLoading(false); }
    }
    load(); return () => { cancelled = true; };
  }, [session, query, status, country, sort, page, size, revision]);
  useEffect(() => {
    if (editing || deleting || contactEditing || contactDeleting) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [editing, deleting, contactEditing, contactDeleting]);
  function closeDialog() { if (busy) return; setEditing(null); setDeleting(null); setContactEditing(null); setContactDeleting(null); setFormError(''); }
  function openScreen(next) { setScreen(next); window.scrollTo({ top: 0 }); }
  useEffect(() => { document.title = screen === 'contacts' ? 'Tailsman · Contacts' : 'Tailsman · People'; }, [screen]);
  function openEditor(profile) { setFormError(''); setViewing(null); setContactEditing(null); setContactDeleting(null); setEditing(profile); }
  function openContactEditor(contact) { setFormError(''); setViewing(null); setEditing(null); setDeleting(null); setContactEditing(contact); }
  async function authenticate(event) {
    event.preventDefault(); setAuthBusy(true); setAuthMessage('');
    const values = new FormData(event.currentTarget);
    try {
      const credentials = { email: values.get('email').trim(), password: values.get('password') };
      const { data, error: authError } = authMode === 'signup' ? await supabase.auth.signUp(credentials) : await supabase.auth.signInWithPassword(credentials);
      if (authError) throw authError;
      if (data.session) setSession(data.session); else setAuthMessage('Check your email to confirm your account, then sign in.');
    } catch (authError) { setAuthMessage(authError.message); } finally { setAuthBusy(false); }
  }
  async function save(event) {
    event.preventDefault(); setBusy(true); setFormError('');
    const values = new FormData(event.currentTarget);
    const profile = Object.fromEntries(['name', 'country', 'email', 'link', 'additional_link', 'status', 'telegram', 'whatsapp', 'discord', 'note'].map(key => [key, String(values.get(key) || '').trim()]));
    profile.contact_id = String(values.get('contact_id') || '').trim() || null;
    try {
      if (!profile.name) throw new Error('Please enter a name.');
      if (!profile.country) throw new Error('Please enter a country.');
      requiredEmail(profile.email);
      if (!profile.link) throw new Error('Please enter a link.');
      if (!statuses.includes(profile.status)) throw new Error('Please choose a status.');
      if (!profile.contact_id) throw new Error('Please choose a contact.');
      optionalLink(profile.link);
      optionalLink(profile.additional_link);
      const result = editing.id ? await supabase.from('profiles').update(profile).eq('id', editing.id).select('id').single() : await supabase.from('profiles').insert(profile).select('id').single();
      if (result.error) throw result.error;
      setEditing(null); setNotice(editing.id ? 'Profile updated successfully.' : 'Profile added successfully.'); setRevision(value => value + 1);
    } catch (saveError) { setFormError(saveError.message); } finally { setBusy(false); }
  }
  async function saveContact(event) {
    event.preventDefault(); setBusy(true); setFormError('');
    const values = new FormData(event.currentTarget);
    const contact = Object.fromEntries(Object.keys(emptyContact).map(key => [key, String(values.get(key) || '').trim()]));
    try {
      if (!contact.name) throw new Error('Please enter a contact name.');
      optionalEmail(contact.email);
      const result = contactEditing.id ? await supabase.from('contacts').update(contact).eq('id', contactEditing.id).select('id').single() : await supabase.from('contacts').insert(contact).select('id').single();
      if (result.error) throw result.error;
      setContactEditing(null); setNotice(contactEditing.id ? 'Contact updated successfully.' : 'Contact added successfully.'); setRevision(value => value + 1);
    } catch (saveError) { setFormError(saveError.message); } finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true); setFormError('');
    try {
      const { error: deleteError } = await supabase.from('profiles').delete().eq('id', deleting.id).select('id').single();
      if (deleteError) throw deleteError;
      setDeleting(null); setNotice('Profile deleted.'); setRevision(value => value + 1);
    } catch (deleteError) { setFormError(deleteError.message); } finally { setBusy(false); }
  }
  async function removeContact() {
    setBusy(true); setFormError('');
    try {
      const { error: deleteError } = await supabase.from('contacts').delete().eq('id', contactDeleting.id).select('id').single();
      if (deleteError) throw deleteError;
      setContactDeleting(null); setNotice('Contact deleted.'); setRevision(value => value + 1);
    } catch (deleteError) { setFormError(deleteError.message); } finally { setBusy(false); }
  }
  const totalPages = Math.max(1, Math.ceil(count / size));
  const enabled = Boolean(session && !loading);
  const dialogTitle = contactDeleting ? 'Delete contact?' : contactEditing ? (contactEditing.id ? 'Edit contact' : 'Add a contact') : deleting ? 'Delete profile?' : editing?.id ? 'Edit profile' : 'Add a new profile';
  const dialogText = contactDeleting ? 'Profiles that used this contact will keep their other details.' : contactEditing ? 'A name is enough to choose this person on a profile.' : deleting ? 'This permanently removes the profile from Supabase.' : 'A few details. A new connection.';
  if (!authReady) return null;
  if (!session) return <div className="gate">{!supabase ? <div className="setup"><strong>Let’s connect your workspace.</strong><span>Add your Supabase URL and public key to <code>.env</code>, then apply the included database migrations. Your profiles will be saved securely in Supabase.</span></div> : <form className="gate-card" onSubmit={authenticate}><a className="brand" href="/"><span className="brand-mark"><Leaf size={23}/></span>tailsman<span className="brand-dot">.</span></a><h1>{authMode === 'signup' ? 'Create account' : 'Sign in'}<span className="heading-dot">.</span></h1><label>Email<input name="email" type="email" autoComplete="email" required/></label><label>Password<input name="password" type="password" autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} minLength={8} required/></label>{authMessage && <p role="status">{authMessage}</p>}<button className="button primary full" disabled={authBusy}>{authBusy ? 'Please wait…' : authMode === 'signup' ? 'Create account' : 'Sign in'}</button><button type="button" className="text-button full" disabled={authBusy} onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); setAuthMessage(''); }}>{authMode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}</button></form>}</div>;
  return <div className="shell">
    <ProfileDetails profile={viewing} onClose={() => setViewing(null)} onEdit={openEditor}/>
    <aside className="sidebar">
      <a className="brand" href="/" onClick={event => { event.preventDefault(); openScreen('people'); }}><span className="brand-mark"><Leaf size={23}/></span>tailsman<span className="brand-dot">.</span></a>
      <div className="workspace"><span className="workspace-icon">T</span><div><strong>Tailsman workspace</strong></div></div>
      <div className="nav-label">WORKSPACE</div>
      <button className={screen === 'people' ? 'nav-item selected' : 'nav-item'} onClick={() => openScreen('people')}><Users size={18}/>People<span>{stats.total}</span></button>
      <button className={screen === 'contacts' ? 'nav-item selected' : 'nav-item'} onClick={() => openScreen('contacts')}><Contact size={18}/>My contacts<span>{stats.contacts}</span></button>
      <div className="sidebar-bottom"><span className="mini-logo"><LayoutGrid size={18}/></span><strong>A little more connected.</strong><p>Your people, all in one place.</p><div className="connection"><span className="online"/>Connected to Supabase</div></div>
    </aside>
    <main>
      <header className="topbar"><span>Workspace <ChevronRight size={13}/> <strong>{screen === 'contacts' ? 'My contacts' : 'People'}</strong></span><div className="account"><span className="account-email">{session.user.email}</span><button className="icon-button" aria-label="Sign out" onClick={async () => { const { error: signOutError } = await supabase.auth.signOut(); if (signOutError) setError(signOutError.message); }}><LogOut size={17}/></button><span className="avatar account-avatar">T</span></div></header>
      <div className="content">
        <div className="breadcrumb">YOUR WORKSPACE, CONNECTED</div>
        {screen === 'contacts' ? <>
          <div className="page-heading"><div><h1>My contacts<span className="heading-dot">.</span></h1><p>Name, email, Telegram, WhatsApp, and Discord. Choose a name when you add a profile.</p></div><button className="button primary" onClick={() => openContactEditor({ ...emptyContact })}><Plus size={17}/>Add contact</button></div>
        </> : <>
          <div className="page-heading"><div><h1>People<span className="heading-dot">.</span></h1><p>A home for every connection. Manage your team’s profiles in one place.</p></div><button className="button primary" onClick={() => openEditor({ ...emptyProfile })}><Plus size={17}/>Add profile</button></div>
          <section className="stats" aria-label="Profile statistics">{[[Users, 'Total profiles', stats.total, 'Everyone in your network'], [LayoutGrid, 'Succeeded', stats.succeeded, 'Connections that worked out'], [Contact, 'My contacts', stats.contacts, 'Saved on the contacts page']].map(([Icon, title, number, subtitle]) => <article className="stat" key={title}><div><span>{title}</span><strong>{number.toLocaleString()}</strong><small>{subtitle}</small></div><span className="stat-icon"><Icon size={20}/></span></article>)}</section>
        </>}
        <DatabaseStatus/>
        {error && <div className="alert" role="alert">{error}<button className="text-button" onClick={() => setRevision(value => value + 1)}>Retry</button></div>}
        {notice && <div className="notice" role="status">{notice}<button className="icon-button" aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={15}/></button></div>}
        {screen === 'contacts' ? <section className="list-panel">
          <div className="list-heading"><div><h2>Contact list <span>{contacts.length}</span></h2><p>The people you can attach to a profile.</p></div><button className="icon-button" aria-label="Refresh contacts" disabled={!enabled} onClick={() => setRevision(value => value + 1)}><RefreshCw size={16}/></button></div>
          <div className="table-wrap"><table aria-label="My contacts"><thead><tr>{['Name', 'Email', 'Telegram', 'WhatsApp', 'Discord', 'Actions'].map(column => <th key={column}>{column}</th>)}</tr></thead>
            <tbody>{contacts.map(contact => <tr key={contact.id}><td><strong className="cell-strong">{contact.name}</strong></td><td>{contact.email || <Blank/>}</td><td>{contact.telegram || <Blank/>}</td><td>{contact.whatsapp || <Blank/>}</td><td>{contact.discord || <Blank/>}</td><td><div className="row-actions"><button className="icon-button" aria-label={`Edit ${contact.name}`} onClick={() => openContactEditor(contact)}><Pencil size={14}/></button><button className="icon-button danger" aria-label={`Delete ${contact.name}`} onClick={() => { setFormError(''); setContactDeleting(contact); }}><Trash2 size={14}/></button></div></td></tr>)}
              {!contacts.length && <tr><td colSpan={6}><div className="empty"><span className="empty-icon"><Contact size={27}/></span><h3>{loading ? 'Loading contacts…' : 'No contacts yet'}</h3><p>Add a contact, then pick that name from the dropdown on a profile.</p>{!loading && <button className="button" onClick={() => openContactEditor({ ...emptyContact })}><Plus size={15}/>Add contact</button>}</div></td></tr>}
            </tbody></table></div>
        </section> : <>
        <section className="list-panel">
          <div className="list-heading"><div><h2>Profile directory <span>{count}</span></h2><p>The people behind your next great collaboration.</p></div><button className="icon-button" aria-label="Refresh profiles" disabled={!enabled} onClick={() => setRevision(value => value + 1)}><RefreshCw size={16}/></button></div>
          <div className="toolbar"><div className="filters"><label className="search"><Search size={16}/><input aria-label="Search profiles by name or email" placeholder="Search by name or email…" value={search} onChange={event => setSearch(event.target.value)}/></label><DirectoryOptions country={country} sort={sort} onCountryChange={changeCountry} onSortChange={value => { setSort(value); setPage(1); }} filtered={Boolean(search || country || status !== 'All statuses' || sort !== 'newest')} onReset={() => { setSearch(''); setQuery(''); setCountry(''); setStatus('All statuses'); setSort('newest'); setPage(1); }}><select className="filter-field" aria-label="Filter by status" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option>All statuses</option>{statuses.map(value => <option key={value}>{value}</option>)}</select></DirectoryOptions></div></div>
          <div className="table-wrap"><table aria-label="Profile directory"><thead><tr>{profileColumns.map(column => <th key={column}>{column}</th>)}</tr></thead><tbody>
            {!loading && rows.map((profile, index) => <tr key={profile.id} className="click-row" tabIndex={0} aria-label={`View ${profile.name}`} onClick={() => setViewing(profile)} onKeyDown={event => { if (event.key === 'Enter') setViewing(profile); }}>
              <td className="muted">{String((page - 1) * size + index + 1).padStart(2, '0')}</td>
              <td><span className="person"><span className="avatar" style={{ background: avatarTones[index % avatarTones.length] }}>{initials(profile.name)}</span><strong>{profile.name}</strong></span></td>
              <td>{profile.country || <Blank/>}</td>
              <td>{profile.email || <Blank/>}</td>
              <td onClick={event => event.stopPropagation()}><ExternalLink value={profile.link}/></td>
              <td><span className={`badge ${profile.status.toLowerCase()}`}><span/>{profile.status}</span></td>
              <td>{profile.contact?.name || <Blank/>}</td>
              <td>{formatWhen(profile.created_at)}</td>
              <td>{formatWhen(profile.updated_at)}</td>
              <td onClick={event => event.stopPropagation()}><div className="row-actions"><button className="icon-button" aria-label={`Edit ${profile.name}`} onClick={() => openEditor(profile)}><Pencil size={14}/></button><button className="icon-button danger" aria-label={`Delete ${profile.name}`} onClick={() => { setFormError(''); setDeleting(profile); }}><Trash2 size={14}/></button></div></td>
            </tr>)}
            {(loading || !rows.length) && <tr><td colSpan={profileColumns.length}><div className="empty"><span className="empty-icon"><Users size={27}/></span><h3>{loading ? 'Loading your people…' : query || status !== 'All statuses' ? 'No matching profiles' : 'Make your first connection'}</h3><p>{loading ? 'Fetching profiles from Supabase.' : 'Add a profile or adjust your filters to find your people.'}</p>{!loading && <button className="button" onClick={() => openEditor({ ...emptyProfile })}><Plus size={15}/>Add profile</button>}</div></td></tr>}
          </tbody></table></div>
          <footer className="pagination"><div>Showing <strong>{count ? (page - 1) * size + 1 : 0}–{Math.min(page * size, count)}</strong> of <strong>{count}</strong> profiles</div><div className="page-controls"><label>Rows per page <select value={size} onChange={event => { setSize(Number(event.target.value)); setPage(1); }}>{[10, 20, 50, 100].map(value => <option key={value}>{value}</option>)}</select></label><span>Page {page} of {totalPages}</span><button className="icon-button bordered" aria-label="Previous page" disabled={!enabled || page === 1} onClick={() => setPage(value => value - 1)}><ChevronLeft size={16}/></button><button className="icon-button bordered" aria-label="Next page" disabled={!enabled || page >= totalPages} onClick={() => setPage(value => value + 1)}><ChevronRight size={16}/></button></div></footer>
        </section></>}
        <div className="bottom-note"><span className="tiny-dot"/>A well-connected team starts with well-organized people.<span>Tailsman © {new Date().getFullYear()}</span></div>
      </div>
    </main>
    <dialog ref={dialogRef} onCancel={event => { event.preventDefault(); closeDialog(); }}>
      <div className="dialog-heading"><div><h2>{dialogTitle}</h2><p>{dialogText}</p></div><button className="icon-button" aria-label="Close dialog" disabled={busy} onClick={closeDialog}><X size={20}/></button></div>
      {contactDeleting ? <><p className="delete-description">Delete <strong>{contactDeleting.name}</strong>? Profiles linked to this contact will show no contact.</p>{formError && <p className="form-error" role="alert">{formError}</p>}<div className="dialog-footer"><button className="button" disabled={busy} onClick={closeDialog}>Cancel</button><button className="button destructive" disabled={busy} onClick={removeContact}>{busy ? 'Deleting…' : 'Delete contact'}</button></div></> : contactEditing ? <form key={contactEditing.id || 'new-contact'} onSubmit={saveContact}><div className="form-grid"><label><span>Name <abbr className="req" title="Required">*</abbr></span><input name="name" autoFocus defaultValue={contactEditing.name} required maxLength={120} placeholder="Full name"/></label><label><span>Email</span><input name="email" type="email" defaultValue={contactEditing.email} maxLength={200} placeholder="name@example.com"/></label><label><span>Telegram</span><input name="telegram" defaultValue={contactEditing.telegram} maxLength={80} placeholder="@username"/></label><label><span>WhatsApp</span><input name="whatsapp" defaultValue={contactEditing.whatsapp} maxLength={80} placeholder="+1 555 0100"/></label><label className="wide"><span>Discord</span><input name="discord" defaultValue={contactEditing.discord} maxLength={80} placeholder="username"/></label></div>{formError && <p className="form-error" role="alert">{formError}</p>}<div className="dialog-footer"><button type="button" className="button" disabled={busy} onClick={closeDialog}>Cancel</button><button className="button primary" disabled={busy}>{busy ? 'Saving…' : contactEditing.id ? 'Save contact' : 'Create contact'}</button></div></form> : deleting ? <><p className="delete-description">Delete <strong>{deleting.name}</strong>? This action cannot be undone.</p>{formError && <p className="form-error" role="alert">{formError}</p>}<div className="dialog-footer"><button className="button" disabled={busy} onClick={closeDialog}>Cancel</button><button className="button destructive" disabled={busy} onClick={remove}>{busy ? 'Deleting…' : 'Delete profile'}</button></div></> : editing && <form key={editing.id || 'new'} onSubmit={save}><div className="form-grid"><label><span>Name <abbr className="req" title="Required">*</abbr></span><input name="name" autoFocus defaultValue={editing.name} required maxLength={120} placeholder="Full name"/></label><label><span>Country <abbr className="req" title="Required">*</abbr></span><input name="country" defaultValue={editing.country} required maxLength={100} placeholder="e.g. Nigeria"/></label><label><span>Email <abbr className="req" title="Required">*</abbr></span><input name="email" type="email" defaultValue={editing.email} required maxLength={200} placeholder="name@example.com"/></label><label><span>Link <abbr className="req" title="Required">*</abbr></span><input name="link" type="url" defaultValue={editing.link} required placeholder="https://…"/></label><label><span>Additional link</span><input name="additional_link" type="url" defaultValue={editing.additional_link} placeholder="https://…"/></label><label><span>Status <abbr className="req" title="Required">*</abbr></span><select name="status" defaultValue={editing.status} required>{statuses.map(value => <option key={value}>{value}</option>)}</select></label><label><span>Telegram</span><input name="telegram" defaultValue={editing.telegram} maxLength={80} placeholder="@username"/></label><label><span>WhatsApp</span><input name="whatsapp" defaultValue={editing.whatsapp} maxLength={80} placeholder="+1 555 0100"/></label><label><span>Discord</span><input name="discord" defaultValue={editing.discord} maxLength={80} placeholder="username"/></label><label><span>My contact <abbr className="req" title="Required">*</abbr></span><select name="contact_id" defaultValue={editing.contact_id || ''} required><option value="">Select a contact</option>{contacts.map(contact => <option key={contact.id} value={contact.id}>{contact.name}</option>)}</select></label><label className="wide"><span>Note</span><textarea name="note" defaultValue={editing.note} maxLength={5000} rows={4} placeholder="Anything you’d like to remember…"/></label></div>{formError && <p className="form-error" role="alert">{formError}</p>}<div className="dialog-footer"><button type="button" className="button" disabled={busy} onClick={closeDialog}>Cancel</button><button className="button primary" disabled={busy}>{busy ? 'Saving…' : editing.id ? 'Save changes' : 'Create profile'}</button></div></form>}
    </dialog>
  </div>;
}

createRoot(document.getElementById('root')).render(<App/>);
