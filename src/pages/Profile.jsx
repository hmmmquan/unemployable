// src/pages/Profile.jsx
import { useState, useEffect } from 'react';
import { useParams, Link }     from 'react-router-dom';
import { supabase }            from '../supabaseClient';
import defaultAvatar           from '../assets/default avatar.jpg';

export default function Profile() {
  const { username } = useParams();
  const [profile,      setProfile]      = useState(null);
  const [session,      setSession]      = useState(null);
  const [isStalking,   setIsStalking]   = useState(false);
  const [stalkersList, setStalkersList] = useState([]);
  const [stalkedList,  setStalkedList]  = useState([]);

  useEffect(() => {
    const load = async () => {
      // Get session (may be null for anon)
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      // Fetch profile by username
      const { data: prof, error: profErr } = await supabase
        .from('Users')
        .select('uuid, username, avatar_url, created_at')
        .eq('username', username)
        .single();
      if (profErr || !prof) return;
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

      // Load stalkers (who follow this profile)
      const { data: sRows } = await supabase
        .from('Stalks')
        .select('stalker_id')
        .eq('stalked_id', prof.uuid);
      const stalkerIds = sRows.map(r => r.stalker_id);
      if (stalkerIds.length > 0) {
        const { data: stalkers } = await supabase
          .from('Users')
          .select('uuid, username, avatar_url')
          .in('uuid', stalkerIds);
        setStalkersList(stalkers);
      }

      // Load stalked (who this profile is stalking)
      const { data: dRows } = await supabase
        .from('Stalks')
        .select('stalked_id')
        .eq('stalker_id', prof.uuid);
      const stalkedIds = dRows.map(r => r.stalked_id);
      if (stalkedIds.length > 0) {
        const { data: stalked } = await supabase
          .from('Users')
          .select('uuid, username, avatar_url')
          .in('uuid', stalkedIds);
        setStalkedList(stalked);
      }
    };

    load();
  }, [username]);

  if (!profile) return null;

  const joinedDate = profile.created_at.slice(0, 10).replace(/-/g, '/');
  const isOwn      = session?.user.id === profile.uuid;
  const isAnon     = !session;

  // Toggles between stalking and unstalking
  const handleStalkToggle = async () => {
    if (!session) return;

    if (isStalking) {
      // Unstalk
      const { error } = await supabase
        .from('Stalks')
        .delete()
        .eq('stalker_id', session.user.id)
        .eq('stalked_id', profile.uuid);
      if (!error) setIsStalking(false);
    } else {
      // Stalk
      const { error } = await supabase
        .from('Stalks')
        .insert({ stalker_id: session.user.id, stalked_id: profile.uuid });
      if (!error) setIsStalking(true);
    }
  };

  // Determine button label & classes
  const label = isStalking ? 'Stalking' : 'Stalk';
  let btnCls  = 'follow-button';
  if (isStalking)           btnCls += ' button-clicked';
  else if (isAnon || isOwn) btnCls += ' button-unclickable';

  return (
    <div className="profile-layout">
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
                {profile.username}
              </Link>
            </span>
            <span className="bio-join-date">
              Member since {joinedDate}
            </span>
            
            {isOwn ? (
              <Link to="/dashboard" className="follow-button">Go to Dashboard</Link>
            ) : (
              <button
                className={btnCls}
                onClick={handleStalkToggle}
                disabled={isAnon}
              >
                {label}
              </button>
            )}
            
          </div>
        </div>
      </section>

      <section id="right-content">
        <section id="topbar">
          <i className="ph ph-files"></i>{' '}
          <Link to={`/profile/${profile.username}`}>
            {profile.username}'s Profile
          </Link>
        </section>

        <section id="main-content">
          <div className="stalker-stalked">
            <div className="stalked-section">
              <span className="section-title"><i class="ph ph-eye"></i> Stalking ({stalkedList.length})</span>
              {stalkedList.length > 0 ? (
                <div className="avatar-grid">
                  {stalkedList.map(u => (
                    <Link key={u.uuid} to={`/profile/${u.username}`} title={`${u.username}`}>
                      <img
                        src={u.avatar_url || defaultAvatar}
                        alt={u.username}
                        className="small-avatar"
                      />
                    </Link>
                  ))}
                </div>
              ) : (
                  <p>This user is not stalking anyone.</p>
              )}
            </div>

            <div className="stalkers-section">
              <span className="section-title"><i class="ph ph-eye-closed"></i> Stalkers ({stalkersList.length})</span>
              {stalkersList.length > 0 ? (
                <div className="avatar-grid">
                  {stalkersList.map(u => (
                    <Link key={u.uuid} to={`/profile/${u.username}`} title={`${u.username}`}>
                      <img
                        src={u.avatar_url || defaultAvatar}
                        alt={u.username}
                        className="small-avatar"
                      />
                    </Link>
                  ))}
                </div>
              ) : (
                <p>This user doesn’t have any stalkers.</p>
              )}
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}
