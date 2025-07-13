// src/pages/Profile.jsx
import { useState, useEffect }   from 'react';
import { useParams, Link }       from 'react-router-dom';
import { supabase }              from '../supabaseClient';
import defaultAvatar             from '../assets/default-avatar.jpg';

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

  // Don't load anything if profile is not fully loaded
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

  const isOwn = session?.user.id === profile.uuid;

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
          <span className="bio-username">@{profile.username}</span>
          <span className="bio-join-date">Member since {joinedDate}</span>

          {/* only show button if signed in and not your own profile */}
          {session && !isOwn && (
            <button
              className="follow-button"
              onClick={handleStalk}
              disabled={isStalking}
              style={{
                opacity:    isStalking ? 0.5 : 1,
                cursor:     isStalking ? 'not-allowed' : 'pointer',
              }}
            >
              {isStalking ? 'Stalked' : 'Stalk'}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
