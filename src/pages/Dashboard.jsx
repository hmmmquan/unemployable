// src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate, Link }   from 'react-router-dom';
import { supabase }            from '../supabaseClient';
import defaultAvatar           from '../assets/default avatar.jpg';

export default function Dashboard() {
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
        .select('stalker_id')
        .eq('stalked_id', data.uuid);
      const stalkerIds = sRows.map(r => r.stalker_id);
      if (stalkerIds.length > 0) {
        const { data: stalkers } = await supabase
          .from('Users')
          .select('uuid, username, avatar_url')
          .in('uuid', stalkerIds);
        setStalkersList(stalkers);
      }

      // Load stalked (who I am stalking)
      const { data: dRows } = await supabase
        .from('Stalks')
        .select('stalked_id')
        .eq('stalker_id', data.uuid);
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
        <div className="bio-nav">
          <Link to="/dashboard"><i class="ph ph-files"></i> <span class="nav-label">Dashboard</span></Link>
          <Link to="/addatitle"><i class="ph ph-hard-drives"></i> <span class="nav-label">Add A Title</span></Link>
        </div>
      </section>

      <section id="right-content">
        <section id="topbar">
          <i className="ph ph-files"></i>
          <Link to="/dashboard">{profile.username}'s Dashboard</Link>
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
                    <Link key={u.uuid} to={`/profile/${u.username}`} title={`@${u.username}`}>
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
              <div className="edit-section">
                <Link to="/connections">Edit</Link>
              </div>
            </div>

            <div className="stalkers-section">
              <span className="section-title">
                <i className="ph ph-eye-closed"></i> Stalkers ({stalkersList.length})
              </span>
              {stalkersList.length > 0 ? (
                <div className="avatar-grid">
                  {stalkersList.map(u => (
                    <Link key={u.uuid} to={`/profile/${u.username}`} title={`@${u.username}`}>
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
              <div className="edit-section">
                <Link to="/connections">Edit</Link>
              </div>
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}
