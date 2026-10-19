import { useEffect, useRef } from 'react';
import { Pencil, X } from 'lucide-react';

function ProfileLink({ value }) {
  if (!value) return <span className="muted">Not provided</span>;
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol)) return <span>Invalid link</span>;
    return <a href={url.href} target="_blank" rel="noreferrer">{value}</a>;
  } catch { return <span>Invalid link</span>; }
}

function when(value) {
  if (!value) return 'Not provided';
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function ProfileDetails({ profile, onClose, onEdit }) {
  const dialog = useRef(null);
  useEffect(() => {
    if (profile) dialog.current?.showModal();
    else dialog.current?.close();
  }, [profile]);
  const contact = profile?.contact;

  return <dialog ref={dialog} aria-labelledby="profile-detail-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    {profile && <>
      <div className="dialog-heading">
        <div><h2 id="profile-detail-title">{profile.name}</h2><p>Profile details</p></div>
        <button className="icon-button" aria-label="Close profile details" onClick={onClose}><X size={20}/></button>
      </div>
      <dl className="profile-details">
        <div><dt>Country</dt><dd>{profile.country || 'Not provided'}</dd></div>
        <div><dt>Email</dt><dd>{profile.email || 'Not provided'}</dd></div>
        <div><dt>Link</dt><dd><ProfileLink value={profile.link}/></dd></div>
        <div><dt>Additional link</dt><dd><ProfileLink value={profile.additional_link}/></dd></div>
        <div><dt>Telegram</dt><dd>{profile.telegram || 'Not provided'}</dd></div>
        <div><dt>WhatsApp</dt><dd>{profile.whatsapp || 'Not provided'}</dd></div>
        <div><dt>Discord</dt><dd>{profile.discord || 'Not provided'}</dd></div>
        <div><dt>Status</dt><dd><span className={`badge ${profile.status.toLowerCase()}`}><span/>{profile.status}</span></dd></div>
        <div><dt>My contact</dt><dd>{contact?.name || 'Not linked'}</dd></div>
        {contact && <>
          <div><dt>Contact email</dt><dd>{contact.email || 'Not provided'}</dd></div>
          <div><dt>Telegram</dt><dd>{contact.telegram || 'Not provided'}</dd></div>
          <div><dt>WhatsApp</dt><dd>{contact.whatsapp || 'Not provided'}</dd></div>
          <div><dt>Discord</dt><dd>{contact.discord || 'Not provided'}</dd></div>
        </>}
        <div><dt>Created</dt><dd>{when(profile.created_at)}</dd></div>
        <div><dt>Updated</dt><dd>{when(profile.updated_at)}</dd></div>
        <div className="wide"><dt>Note</dt><dd className="detail-note">{profile.note || 'No notes yet.'}</dd></div>
      </dl>
      <div className="dialog-footer"><button className="button" onClick={onClose}>Close</button><button className="button primary" onClick={() => onEdit(profile)}><Pencil size={14}/>Edit profile</button></div>
    </>}
  </dialog>;
}
