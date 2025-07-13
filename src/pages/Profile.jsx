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

  // Don't render until profile is loaded
  if (!profile) return null;

  const joinedDate = profile.created_at.slice(0, 10).replace(/-/g, '/');

  const handleStalk = async () => {
    if (!session || isStalking) return;
    const { error } = await supabase
      .from('Stalks')
      .insert({
        stalker_id: session.user.id,
        stalked_id: profile.uuid,
      });
    if (!error) setIsStalking(true);
  };

  const isOwn    = session?.user.id === profile.uuid;
  const isAnon   = !session;
  const disabled = isAnon || isOwn || isStalking;
  const label    = isStalking ? 'Already stalking' : 'Stalk';

  // build the className based on state
  let btnClass = 'follow-button';
  if (isStalking) {
    btnClass += ' button-clicked';
  } else if (isAnon || isOwn) {
    btnClass += ' button-unclickable';
  }

  return (
    <section id="sidebar">
      <div className="bio-header">
        <Link to={`/profile/${profile.username}`} className="bio-avatar">
          <img
            src={profile.avatar_url || defaultAvatar}
            alt={`${profile.username}’s avatar`}
          />
        </Link>

        <div className="bio-info">
          <span className="bio-username"><Link to={`/profile/${profile.username}`}>@{profile.username}</Link></span>
          <span className="bio-join-date">Member since {joinedDate}</span>

          <button
            className={btnClass}
            onClick={handleStalk}
            disabled={disabled}
          >
            {label}
          </button>
        </div>
      </div>
    </section>
  );
}
