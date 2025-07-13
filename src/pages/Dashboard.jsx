// src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate, Link }   from 'react-router-dom';
import { supabase }            from '../supabaseClient';
import defaultAvatar             from '../assets/default avatar.jpg';

export default function Dashboard() {
  const [profile, setProfile] = useState(null);
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
        .select('username, avatar_url, created_at')
        .eq('uuid', session.user.id)
        .single();

      // Redirect on any error
      if (error || !data) return navigate('/', { replace: true });

      setProfile(data);
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
    <section id="sidebar">
      <div className="bio-header">
        <Link to="/dashboard" className="bio-avatar">
          <img
            src={profile.avatar_url || defaultAvatar}
            alt={`${profile.username}’s avatar`}
          />
        </Link>
        <div className="bio-info">
          <span className="bio-username"><Link to="/dashboard">@{profile.username}</Link></span>
          <span className="bio-join-date">Member since {joinedDate}</span>
          <Link className="view-public-profile-button" to={`/profile/${profile.username}`}>View public profile</Link>
        </div>
      </div>
    </section>
  );
}
