// src/pages/Profile.jsx
import { useState, useEffect } from 'react';
import { useParams, Link }     from 'react-router-dom';
import { supabase }            from '../supabaseClient';
import defaultAvatar           from '../assets/default avatar.jpg';

export default function Profile() {
  const { username } = useParams();
  const [profile,    setProfile]    = useState(null);
  const [session,    setSession]    = useState(null);
  const [isStalking, setIsStalking] = useState(false);

  useEffect(() => {
    const load = async () => {
      // Get session (may be null for anon)
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      // Fetch profile using username 
      const { data: prof, error: profErr } = await supabase
        .from('Users')
        .select('uuid, username, avatar_url, created_at')
        .eq('username', username)
        .single();
      if (profErr || !prof) return;  // Optionally show “not found”
      setProfile(prof);

      // If signed in, check stalking status
      if (session) {
        const { count } = await supabase
          .from('Stalks')
          .select('*', { head: true, count: 'exact' })
          .eq('stalker_id', session.user.id)
          .eq('stalked_id', prof.uuid);
        setIsStalking(count > 0);
      }
    };

    load();
  }, [username]);

  if (!profile) return null;

  const joinedDate = profile.created_at.slice(0, 10).replace(/-/g, '/');
  const isOwn      = session?.user.id === profile.uuid;
  const isAnon     = !session;

  // toggles between stalking and unstalking
  const handleStalkToggle = async () => {
    if (!session) return; // no-op for anon

    if (isStalking) {
      // unstalk
      const { error } = await supabase
        .from('Stalks')
        .delete()
        .eq('stalker_id', session.user.id)
        .eq('stalked_id', profile.uuid);
      if (!error) setIsStalking(false);
    } else {
      // stalk
      const { error } = await supabase
        .from('Stalks')
        .insert({ stalker_id: session.user.id, stalked_id: profile.uuid });
      if (!error) setIsStalking(true);
    }
  };

  // determine button label & classes
  const label   = isStalking ? 'Stalking' : 'Stalk';
  let   btnCls  = 'follow-button';
  if (isStalking)         btnCls += ' button-clicked';
  else if (isAnon || isOwn) btnCls += ' button-unclickable';

  return (
    <section id="sidebar">
      <div className="bio-header">
        <Link to="/dashboard" className="bio-avatar">
          <img
            src={profile.avatar_url || defaultAvatar}
            alt={`${profile.username}’s avatar`}
          />
        </Link>
        <div className="bio-info">
          <span className="bio-username">
            <Link to={`/profile/${profile.username}`}>
              @{profile.username}
            </Link>
          </span>
          <span className="bio-join-date">
            Member since {joinedDate}
          </span>
          <button
            className={btnCls}
            onClick={handleStalkToggle}
            disabled={isAnon || isOwn}
          >
            {label}
          </button>
        </div>
      </div>
    </section>
  );
}
