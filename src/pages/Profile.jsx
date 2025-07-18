// src/pages/Profile.jsx
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import defaultAvatar from '../assets/default avatar.jpg';

export default function Profile() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [session, setSession] = useState(null);
  const [myUsername, setMyUsername] = useState(null);
  const [isStalking, setIsStalking] = useState(false);
  const [stalkersList, setStalkersList] = useState([]);
  const [stalkedList, setStalkedList] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      // Fetch your user record so we know your username
      const { data: me } = await supabase
        .from('users')
        .select('username')
        .eq('uuid', session.user.id)
        .single();
      if (me) setMyUsername(me.username);
    })();
  }, []);

  const load = async () => {
    // clear out old data on every profile change
    setStalkersList([]);
    setStalkedList([]);

    // Get session (may be null for anon)
    const { data: { session } } = await supabase.auth.getSession();
    setSession(session);

    // Fetch profile by username
    const { data: prof, error: profErr } = await supabase
      .from('users')
      .select('uuid, username, avatar_url, created_at')
      .eq('username', username)
      .single();
    if (profErr || !prof) return;
    setProfile(prof);

    // If signed in, check stalking status
    if (session) {
      const { count } = await supabase
        .from('stalks')
        .select('*', { head: true, count: 'exact' })
        .eq('stalker_id', session.user.id)
        .eq('stalked_id', prof.uuid);
      setIsStalking(count > 0);
    }

    // Load stalkers (who follow this profile)
    const { data: sRows } = await supabase
      .from('stalks')
      .select('stalker_id')
      .eq('stalked_id', prof.uuid);
    const stalkerIds = sRows.map(r => r.stalker_id);
    if (stalkerIds.length > 0) {
      const { data: stalkers } = await supabase
        .from('users')
        .select('uuid, username, avatar_url')
        .in('uuid', stalkerIds);
      setStalkersList(stalkers);
    }

    // Load stalked (who this profile is stalking)
    const { data: dRows } = await supabase
      .from('stalks')
      .select('stalked_id')
      .eq('stalker_id', prof.uuid);
    const stalkedIds = dRows.map(r => r.stalked_id);
    if (stalkedIds.length > 0) {
      const { data: stalked } = await supabase
        .from('users')
        .select('uuid, username, avatar_url')
        .in('uuid', stalkedIds);
      setStalkedList(stalked);
    }
  };

  useEffect(() => {
    load();
  }, [username]);

  if (!profile) return null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/', { replace: true });
  };

  const joinedDate = profile.created_at.slice(0, 10).replace(/-/g, '/');
  const isOwn = session?.user.id === profile.uuid;
  const isAnon = !session;

  // Toggles between stalking and unstalking
  const handleStalkToggle = async () => {
    if (!session) return;

    if (isStalking) {
      // Unstalk
      const { error } = await supabase
        .from('stalks')
        .delete()
        .eq('stalker_id', session.user.id)
        .eq('stalked_id', profile.uuid);
      if (!error) {
        setIsStalking(false);
        load();
      }
    } else {
      // Stalk
      const { error } = await supabase
        .from('stalks')
        .insert({ stalker_id: session.user.id, stalked_id: profile.uuid });
      if (!error) {
        setIsStalking(true);
        load();
      }
    }
  };

  // Determine button label & classes
  const label = isStalking ? 'Stalking' : 'Stalk';
  let btnCls = 'follow-button';
  if (isStalking) btnCls += ' button-clicked';
  else if (isAnon || isOwn) btnCls += ' button-unclickable';

  return (
    <div className="profile-layout">
      <section
        id="sidebar"
        className={sidebarCollapsed ? 'collapsed' : ''}
      >
        <div className="toggle-section">
          <button
            className="nav-link-button"
            title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <i className={`ph ${sidebarCollapsed ? 'ph-arrows-out-simple' : 'ph-arrows-in-simple'}`}></i>
          </button>
        </div>

        <div className="bio-header">
          <Link to={`/profile/${profile.username}`} className="bio-avatar">
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
              <Link to="/dashboard" className="view-public-profile-button">
                Go to Dashboard
              </Link>
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
          <Link to="/"><i class="ph ph-house-line"></i>Home</Link>

          {session && (
            <Link to="/dashboard"><i className="ph ph-chalkboard-teacher"></i>Dashboard</Link>
          )}

          <Link to="/titles"><i class="ph ph-files"></i>Titles</Link>

          <Link to="/people"><i class="ph ph-files"></i>People</Link>

          {myUsername && (
            <Link to={`/profile/${myUsername}`}><i class="ph ph-user"></i>Profile</Link>
          )}

          {session ? (
            <button onClick={handleLogout} className="log-button"><i className="ph ph-sign-out"></i>Log out</button>
          ) : (
            <Link to="/"><i className="ph ph-sign-in"></i>Log in</Link>
          )}
        </section>

        <section id="main-content">
          <div className="stalker-stalked">
            <div className="stalked-section">
              <span className="section-title">
                <i className="ph ph-eye"></i> Stalking ({stalkedList.length})
              </span>
              {stalkedList.length > 0 ? (
                <div className="avatar-grid">
                  {stalkedList.map(u => (
                    <Link
                      key={u.uuid}
                      to={`/profile/${u.username}`}
                      title={`${u.username}`}
                    >
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
              <span className="section-title">
                <i className="ph ph-eye-closed"></i> Stalkers ({stalkersList.length})
              </span>
              {stalkersList.length > 0 ? (
                <div className="avatar-grid">
                  {stalkersList.map(u => (
                    <Link
                      key={u.uuid}
                      to={`/profile/${u.username}`}
                      title={`${u.username}`}
                    >
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
