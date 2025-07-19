// src/pages/Title.jsx
import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import defaultAvatar from '../assets/default avatar.jpg';

export default function Title() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { shortId } = useParams();
  const [title, setTitle] = useState(null);
  const [session, setSession] = useState(null);
  const [myUsername, setMyUsername] = useState(null);
  const [profile, setProfile] = useState(null);
  const navigate = useNavigate();

  // Film specific states
  const [filmProps, setFilmProps] = useState({});
  const [countries, setCountries] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [rating, setRating] = useState('');
  const [altTitles, setAltTitles] = useState([]);
  const [externalLinks, setExternalLinks] = useState([]);
  const [related, setRelated] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [creator, setCreator] = useState(null);

  // Edit fields
  const [isEditing, setIsEditing] = useState(false);
  const [nativeInput, setNativeInput] = useState('');
  const [synopsisInput, setSynopsisInput] = useState('');
  const [statusInput, setStatusInput] = useState('');
  const [releaseInput, setReleaseInput] = useState('');
  const [endInput, setEndInput] = useState('');

  // Cover preview rotation
  const [rotateImg, setRotateImg] = useState(false);
  const imgRef = useRef();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session) {
        const { data: me } = await supabase
          .from('users')
          .select('username, avatar_url, created_at')
          .eq('uuid', session.user.id)
          .single();
        if (me) {
          setMyUsername(me.username);
          setProfile(me);
        }
      }
    })();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      const { data: t, error: tErr } = await supabase
        .from('titles')
        .select('*')
        .eq('short_id', Number(shortId))
        .single();
      if (tErr || !t) return navigate('/titles', { replace: true });
      setTitle(t);

      setNativeInput(t.native_title);
      setSynopsisInput(t.synopsis || '');
      setStatusInput(t.status);
      setReleaseInput(t.release_date || '');
      setEndInput(t.end_date || '');

      if (t.created_by) {
        const { data: c } = await supabase
          .from('users')
          .select('username')
          .eq('uuid', t.created_by)
          .single();
        if (c) setCreator(c.username);
      }

      if (t.type === 'Film') {
        const { data: f } = await supabase
          .from('films')
          .select('total_duration, content_rating_id')
          .eq('title_id', t.id)
          .single();
        setFilmProps(f || {});

        if (f?.content_rating_id) {
          const { data: r } = await supabase
            .from('content_ratings')
            .select('label')
            .eq('rating_id', f.content_rating_id)
            .single();
          setRating(r?.label || '');
        }

        const { data: mc } = await supabase
          .from('media_countries')
          .select('countries(name)')
          .eq('title_id', t.id);
        setCountries(mc?.map((x) => x.countries.name) || []);

        const { data: ml } = await supabase
          .from('media_languages')
          .select('languages(name)')
          .eq('title_id', t.id);
        setLanguages(ml?.map((x) => x.languages.name) || []);

        const { data: mats } = await supabase
          .from('media_alt_titles')
          .select('alt_title')
          .eq('title_id', t.id);
        setAltTitles(mats?.map((x) => x.alt_title) || []);

        const { data: ex } = await supabase
          .from('media_external_links')
          .select('link_label, url')
          .eq('title_id', t.id);
        setExternalLinks(ex || []);

        const { data: rel } = await supabase
          .from('media_related_titles')
          .select('related_title_id, titles(native_title, known_as, short_id)')
          .eq('title_id', t.id);
        setRelated(
          rel?.map((r) => ({
            id: r.related_title_id,
            native: r.titles.native_title,
            known: r.titles.known_as,
            short: r.titles.short_id,
          })) || []
        );

        const { data: mcps } = await supabase
          .from('media_companies')
          .select('companies(name), role')
          .eq('title_id', t.id);
        setCompanies(
          mcps?.map((x) => ({ name: x.companies.name, role: x.role })) || []
        );
      }
    };
    loadData();
  }, [shortId, navigate]);

  // Rotate cover if needed
  const handleImageLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    if (['Album', 'Song'].includes(title.type)) {
      setRotateImg(false);
    } else {
      setRotateImg(img.naturalWidth > img.naturalHeight);
    }
  };

  const handleSave = async () => {

  };

  if (!title) return null;

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
          {session && profile ? (
            <>
              <Link to="/dashboard" className="bio-avatar">
                <img
                  src={profile.avatar_url || defaultAvatar}
                  alt={`${myUsername}’s avatar`}
                />
              </Link>
              <div className="bio-info">
                <span className="bio-username">
                  <Link to="/dashboard">{myUsername}</Link>
                </span>
                <span className="bio-join-date">
                  Member since {profile.created_at.slice(0, 10).replace(/-/g, '/')}
                </span>
                <Link to={`/profile/${myUsername}`} className="view-public-profile-button">
                  View Public Profile
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="bio-avatar">
                <img src={defaultAvatar} alt="Anonymous avatar" />
              </div>
              <div className="bio-info">
                <span className="bio-username">Anonymous</span>
                <span className="bio-join-date">
                  Limited access
                </span>
                <Link to="/" className="view-public-profile-button">
                  Log In
                </Link>
              </div>
            </>
          )}
        </div>
        <div className="bio-nav">
          <button
            className="nav-link-button"
            onClick={() => {
              if (!session) return navigate('/', { replace: true });
              // TODO: implement “Log This Title” action
            }}
          >
            <i className="ph ph-note-pencil"></i> Log This Title
          </button>

          <button
            className="nav-link-button"
            onClick={() => {
              if (!session) return navigate('/', { replace: true });
              setIsEditing(true);
            }}
          >
            <i className="ph ph-eraser"></i> Edit This Title
          </button>

          <button
            className="nav-link-button"
            onClick={() => {
              if (!session) return navigate('/', { replace: true });
              // TODO: implement “Add to Favorites” action
            }}
          >
            <i className="ph ph-heart"></i> Add to Favorites
          </button>
        </div>

      </section>

      <section id="right-content">
        <section id="topbar">
          <Link to="/">
            <i className="ph ph-house-line"></i> Home
          </Link>
          {session && (
            <Link to="/dashboard">
              <i className="ph ph-chalkboard-teacher"></i> Dashboard
            </Link>
          )}
          <Link to="/titles">
            <i className="ph ph-files"></i> Titles
          </Link>
          <Link to="/people">
            <i className="ph ph-files"></i> People
          </Link>
          {myUsername && (
            <Link to={`/profile/${myUsername}`}><i class="ph ph-user"></i>Profile</Link>
          )}
          {session ? (
            <button onClick={handleLogout} className="log-button">
              <i className="ph ph-sign-out"></i> Log out
            </button>
          ) : (
            <Link to="/">
              <i className="ph ph-sign-in"></i> Log in
            </Link>
          )}
        </section>

        <section id="main-content">
          <div className="add-title-container">
            <span className="section-title">
              <i className="ph ph-files"></i> {title.known_as}
            </span>

            <div className="form-layout">
              <div className="preview-box">
                {title.cover_image_url && (
                  <img
                    ref={imgRef}
                    src={title.cover_image_url}
                    alt="Cover"
                    onLoad={handleImageLoad}
                    className={rotateImg ? 'rotated' : ''}
                  />
                )}
              </div>
              <div className="form-fields">
                <div className="form-row-two">
                  <div className="form-group">
                    <label>Media Type</label>
                    <span>{title.type.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <span>{title.status}</span>
                  </div>
                  <div className="form-group">
                    <label>Added By</label>
                    <span>{creator && (<Link to={`/profile/${creator}`}>{creator}</Link>)}</span>
                  </div>
                </div>
                <div className="form-group">
                  <label>Native Title</label>
                  <span>{title.native_title}</span>
                </div>
                <div className="form-group">
                  <label>Synopsis</label>
                  <span>{title.synopsis}</span>
                </div>
                <div className="form-row-two">
                  <div className="form-group">
                    <label>Release Date</label>
                    <span>{title.release_date?.slice(0, 10).replace(/-/g, '/')}</span>
                  </div>
                  <div className="form-group">
                    <label>End Date</label>
                    <span>{title.end_date?.slice(0, 10).replace(/-/g, '/')}</span>
                  </div>
                </div>
                {title.type === 'Film' && (
                  <>
                    <div className="form-row-two">
                      <div className="form-group">
                        <label>Total Duration</label>
                        <span>{filmProps.total_duration}</span>
                      </div>
                      <div className="form-group">
                        <label>Content Rating</label>
                        <span>{rating}</span>
                      </div>
                    </div>
                    <div className="form-row-two">
                      <div className="form-group">
                        <label>Production Countries</label>
                        <span>{countries.join(', ')}</span>
                      </div>
                      <div className="form-group">
                        <label>Languages</label>
                        <span>{languages.join(', ')}</span>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Alternate Titles</label>
                      <span>{altTitles.join(', ')}</span>
                    </div>
                    <div className="form-group">
                      <label>Production Companies</label>
                      <span>{companies.map(c => `${c.name}${c.role ? ` (${c.role})` : ''}`).join(', ')}</span>
                    </div>
                    <div className="form-group">
                      <label>Related Titles</label>
                      <span>
                        {related.map(r => (
                          <Link key={r.id} to={`/titles/${r.short}`}>{r.known || r.native}</Link>
                        ))}
                      </span>
                    </div>
                    <div className="form-group">
                      <label>External Links</label>
                      <span>
                        {externalLinks.map(l => (
                          <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer">
                            {l.link_label || l.url}
                          </a>
                        ))}
                      </span>
                    </div>
                  </>
                )}

                {isEditing && (
                  <section className="edit-section">
                    <button
                      className="create-title-button"
                      onClick={handleSave /* your update handler */}
                    >
                      Save Changes
                    </button>
                    <button
                      className="create-title-button"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancel
                    </button>
                  </section>
                )}

              </div>
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}
