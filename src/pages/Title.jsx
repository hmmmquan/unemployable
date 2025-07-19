// src/pages/Title.jsx
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import defaultAvatar from '../assets/default avatar.jpg';

export default function Title() {
  const { shortId } = useParams();
  const navigate = useNavigate();

  // Sidebar collapsed state & user profile
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profile, setProfile] = useState(null);

  // Title data and film properties
  const [title, setTitle] = useState(null);
  const [filmProps, setFilmProps] = useState({});
  const [countries, setCountries] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [rating, setRating] = useState('');
  const [altTitles, setAltTitles] = useState([]);
  const [externalLinks, setExternalLinks] = useState([]);
  const [related, setRelated] = useState([]);
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    const loadProfile = async () => {
      // Get session and redirect if not logged in
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return navigate('/', { replace: true });

      // Fetch user profile by UUID
      const { data, error } = await supabase
        .from('users')
        .select('uuid, username, avatar_url, created_at')
        .eq('uuid', session.user.id)
        .single();
      if (error || !data) return navigate('/', { replace: true });
      setProfile(data);
    };
    loadProfile();
  }, [navigate]);

  useEffect(() => {
    const loadData = async () => {
      // Fetch title by short_id
      const { data: t, error: tErr } = await supabase
        .from('titles')
        .select('*')
        .eq('short_id', Number(shortId))
        .single();
      if (tErr || !t) return navigate('/titles', { replace: true });
      setTitle(t);

      // Only load film-specific props when viewing a film
      if (t.type === 'Film') {
        // Fetch film row
        const { data: f } = await supabase
          .from('films')
          .select('total_duration, content_rating_id')
          .eq('title_id', t.id)
          .single();
        setFilmProps(f || {});

        // Fetch content rating label
        if (f?.content_rating_id) {
          const { data: r } = await supabase
            .from('content_ratings')
            .select('label')
            .eq('rating_id', f.content_rating_id)
            .single();
          setRating(r?.label || '');
        }

        // Fetch production countries
        const { data: mc } = await supabase
          .from('media_countries')
          .select('countries(name)')
          .eq('title_id', t.id);
        setCountries(mc?.map(x => x.countries.name) || []);

        // Fetch featured languages
        const { data: ml } = await supabase
          .from('media_languages')
          .select('languages(name)')
          .eq('title_id', t.id);
        setLanguages(ml?.map(x => x.languages.name) || []);

        // Fetch alternate titles
        const { data: mats } = await supabase
          .from('media_alt_titles')
          .select('alt_title')
          .eq('title_id', t.id);
        setAltTitles(mats?.map(x => x.alt_title) || []);

        // Fetch external links
        const { data: ex } = await supabase
          .from('media_external_links')
          .select('link_label, url')
          .eq('title_id', t.id);
        setExternalLinks(ex || []);

        // Fetch related titles
        const { data: rel } = await supabase
          .from('media_related_titles')
          .select('related_title_id, titles(native_title, known_as, short_id)')
          .eq('title_id', t.id);
        setRelated(
          rel?.map(r => ({
            id: r.related_title_id,
            native: r.titles.native_title,
            known: r.titles.known_as,
            short: r.titles.short_id,
          })) || []
        );

        // Fetch production companies
        const { data: mcps } = await supabase
          .from('media_companies')
          .select('companies(name), role')
          .eq('title_id', t.id);
        setCompanies(
          mcps?.map(x => ({ name: x.companies.name, role: x.role })) || []
        );
      }
    };
    loadData();
  }, [shortId, navigate]);

  // Don't render until profile & title are ready
  if (!profile || !title) return null;

  const joinedDate = profile.created_at.slice(0, 10).replace(/-/g, '/');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/', { replace: true });
  };

  return (
    <div className="profile-layout">
      <section id="sidebar" className={sidebarCollapsed ? 'collapsed' : ''}>
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
          <Link to="/dashboard" className="bio-avatar">
            <img src={profile.avatar_url || defaultAvatar} alt={`${profile.username}’s avatar`} />
          </Link>
          <div className="bio-info">
            <span className="bio-username"><Link to="/dashboard">{profile.username}</Link></span>
            <span className="bio-join-date">Member since {joinedDate}</span>
            <Link to={`/profile/${profile.username}`} className="view-public-profile-button">
              View Public Profile
            </Link>
          </div>
        </div>
        <div className="bio-nav">
          <Link to="/titles/add"><i className="ph ph-file-plus"></i> <span className="nav-label">Add A Title</span></Link>
          <Link to="/people/add"><i className="ph ph-file-plus"></i> <span className="nav-label">Add A Person</span></Link>
        </div>
      </section>

      <section id="right-content">
        <section id="topbar">
          <Link to="/"><i className="ph ph-house-line"></i> Home</Link>
          {profile && <Link to="/dashboard"><i className="ph ph-chalkboard-teacher"></i> Dashboard</Link>}
          <Link to="/titles"><i className="ph ph-files"></i> Titles</Link>
          <Link to="/people"><i className="ph ph-files"></i> People</Link>
          {profile ? (
            <button onClick={handleLogout} className="log-button">
              <i className="ph ph-sign-out"></i> Log out
            </button>
          ) : (
            <Link to="/"><i className="ph ph-sign-in"></i> Log in</Link>
          )}
        </section>

        <section id="main-content">
          <div className="add-title-container">
            <span className="section-title">
              <i className="ph ph-file-plus"></i> {title.known_as}
            </span>

            <div className="form-fields">
              <p><strong>Native Title:</strong> {title.native_title}</p>
              {title.type === 'Film' && <p><strong>Alt Titles:</strong> {altTitles.join(', ')}</p>}
              <p><strong>Synopsis:</strong> {title.synopsis}</p>
              <p><strong>Status:</strong> {title.status}</p>
              <p><strong>Release Date:</strong> {title.release_date}</p>
              {title.type === 'Film' && (
                <>
                  <p><strong>Total Duration:</strong> {filmProps?.total_duration}</p>
                  <p><strong>Production Countries:</strong> {countries.join(', ')}</p>
                  <p><strong>Content Rating:</strong> {rating}</p>
                  <p><strong>Languages:</strong> {languages.join(', ')}</p>
                  <p><strong>External Links:</strong> {externalLinks.map(l => (
                    <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer">
                      {l.link_label || l.url}
                    </a>
                  ))}</p>
                  <p><strong>Related Titles:</strong> {related.map(r => (
                    <Link key={r.id} to={`/titles/${r.short}`}>{r.known || r.native}</Link>
                  ))}</p>
                  <p><strong>Production Companies:</strong> {companies.map(c => `${c.name}${c.role ? ` (${c.role})` : ''}`).join(', ')}</p>
                </>
              )}
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}
