// src/pages/Connections.jsx
import { useState, useEffect } from 'react';
import { useNavigate, Link }   from 'react-router-dom';
import { supabase }            from '../supabaseClient';
import defaultAvatar           from '../assets/default avatar.jpg';

export default function Connections() {
  const [profile,      setProfile]      = useState(null);
  const [stalkersList, setStalkersList] = useState([]);
  const [stalkedList,  setStalkedList]  = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {

      // Get session
      const { data: { session } } = await supabase.auth.getSession();

      // Redirect to homepage if not logged in
      if (!session) return navigate('/', { replace: true });

      // Fetch profile using uuid
      const { data, error } = await supabase
        .from('Users')
        .select('uuid, username, avatar_url, created_at')
        .eq('uuid', session.user.id)
        .single();

      // Redirect on any error
      if (error || !data) return navigate('/', { replace: true });

      setProfile(data);

      // Load stalkers (who follow me)
      const { data: sRows } = await supabase
        .from('Stalks')
        .select('stalker_id, created_at')
        .eq('stalked_id', data.uuid);
      const stalkerIds = sRows.map(r => r.stalker_id);
      if (stalkerIds.length > 0) {
        const { data: stalkers } = await supabase
          .from('Users')
          .select('uuid, username, avatar_url')
          .in('uuid', stalkerIds);
        // attach the timestamp
        const enrichedStalkers = stalkers.map(u => {
          const rel = sRows.find(r => r.stalker_id === u.uuid);
          return { ...u, followedAt: rel.created_at };
        });
        setStalkersList(enrichedStalkers);
      }

      // Load stalked (who I am stalking)
      const { data: dRows } = await supabase
        .from('Stalks')
        .select('stalked_id, created_at')
        .eq('stalker_id', data.uuid);
      const stalkedIds = dRows.map(r => r.stalked_id);
      if (stalkedIds.length > 0) {
        const { data: stalked } = await supabase
          .from('Users')
          .select('uuid, username, avatar_url')
          .in('uuid', stalkedIds);
        // attach the timestamp
        const enrichedStalked = stalked.map(u => {
          const rel = dRows.find(r => r.stalked_id === u.uuid);
          return { ...u, followedAt: rel.created_at };
        });
        setStalkedList(enrichedStalked);
      }
    };

    load();
  }, [navigate]);

  // Don't load anything if profile is not fully loaded
  if (!profile) return null;

  const joinedDate = profile.created_at.slice(0, 10).replace(/-/g, '/');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/', { replace: true });
  };

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
              <Link to="/dashboard">{profile.username}</Link>
            </span>
            <span className="bio-join-date">Member since {joinedDate}</span>
            <Link
              className="view-public-profile-button"
              to={`/profile/${profile.username}`}
            >
              View Public Profile
            </Link>
          </div>
        </div>
      </section>

      <section id="right-content">
        <section id="topbar">
          <i className="ph ph-files"></i>
          <Link to="/dashboard">{profile.username}'s Dashboard</Link>
          <i className="ph ph-arrow-right"></i>
          <Link to="/connections">Connections</Link>
        </section>

        <section id="main-content">
          <div className="stalker-stalked">
            <div className="stalked-section">
              <span className="section-title">
                {/* Stalking (who I’m following) */}
                <i className="ph ph-eye"></i> Stalking ({stalkedList.length})
              </span>
              {stalkedList.length > 0 ? (
                <div className="connections-list">
                  {stalkedList.map(u => (
                    <div key={u.uuid} className="connections-row">
                      <Link className="medium-avatar" to={`/profile/${u.username}`}><img
                        src={u.avatar_url || defaultAvatar}
                        alt={u.username}
                      /></Link>
                      <div className="connections-info">
                        <Link to={`/profile/${u.username}`}>
                          {u.username}
                        </Link>
                        <span>
                          Since{' '}
                          {u.followedAt.slice(0, 10).replace(/-/g, '/')}
                        </span>
                      </div>
                      <button className="remove-button">
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p>This user is not stalking anyone.</p>
              )}
            </div>

            <div className="stalkers-section">
              <span className="section-title">
                {/* Stalkers (who follow me) */}
                <i className="ph ph-eye-closed"></i> Stalkers ({stalkersList.length})
              </span>
              {stalkersList.length > 0 ? (
                <div className="connections-list">
                  {stalkersList.map(u => (
                    <div key={u.uuid} className="connections-row">
                      <Link className="medium-avatar" to={`/profile/${u.username}`}><img
                        src={u.avatar_url || defaultAvatar}
                        alt={u.username}
                      /></Link>
                      <div className="connections-info">
                        <Link to={`/profile/${u.username}`}>
                          {u.username}
                        </Link>
                        <span>
                          Since{' '}
                          {u.followedAt.slice(0, 10).replace(/-/g, '/')}
                        </span>
                      </div>
                      <button className="remove-button">
                        Remove
                      </button>
                    </div>
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
