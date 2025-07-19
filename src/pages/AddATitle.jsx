// src/pages/AddATitle.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link }           from 'react-router-dom';
import { supabase }                    from '../supabaseClient';
import defaultAvatar                   from '../assets/default avatar.jpg';

export default function AddATitle() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profile, setProfile] = useState(null);
  const navigate               = useNavigate();

  const [mediaType, setMediaType]     = useState('Film');
  const [nativeTitle, setNativeTitle] = useState('');
  const [knownAs, setKnownAs]         = useState('');
  const [synopsis, setSynopsis]       = useState('');
  const [status, setStatus]           = useState('Unconfirmed');
  const [coverUrl, setCoverUrl]       = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [endDate, setEndDate]         = useState('');

  const [submitError, setSubmitError] = useState('');

  // Preview rotation
  const [rotateImg, setRotateImg] = useState(false);
  const imgRef                    = useRef();

  useEffect(() => {
    const load = async () => {

      // Get session
      const { data: { session } } = await supabase.auth.getSession();

      // Redirect to homepage if not logged in
      if (!session) return navigate('/', { replace: true });

      // Fetch profile using uuid
      const { data, error } = await supabase
        .from('users')
        .select('uuid, username, avatar_url, created_at')
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

  const joinedDate = profile.created_at.slice(0,10).replace(/-/g,'/');
  const userId     = profile.uuid;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/', { replace: true });
  };

  // Clear end date field and rotation state
  const handleMediaTypeChange = e => {
    const type = e.target.value;
    setMediaType(type);
    // Clear end date for certain types
    if (['Film','Book','Song','Album','TV_Segment'].includes(type)) {
      setEndDate('');
    }
    // Disable rotation when switching to Album or Song, otherwise update rotation
    if (['Album','Song'].includes(type)) {
      setRotateImg(false);
    } else if (imgRef.current) {
      handleImageLoad();
    }
  };

  // Rotate image if width is > height, but never for Album or Song
  const handleImageLoad = () => {
    const img = imgRef.current;
    if (img) {
      if (['Album','Song'].includes(mediaType)) {
        setRotateImg(false);
      } else {
        setRotateImg(img.naturalWidth > img.naturalHeight);
      }
    }
  };

  // Insert into title table and matching subtype table
  const handleSubmit = async e => {
    e.preventDefault();
    setSubmitError('');

    const now = new Date().toISOString();

    const payload = {
      type:             mediaType,
      native_title:     nativeTitle,
      known_as:         knownAs,
      synopsis,
      status,
      cover_image_url:  coverUrl,
      release_date:     releaseDate || null,
      end_date:         ['Film','Book','Song','Album','TV_Segment'].includes(mediaType)
                          ? null
                          : endDate || null,
      created_by:       userId,
      last_updated_by:  userId,
      created_at:       now,
      updated_at:       now,
    };

    // Insert into titles, returning both id and short_id
    const { data, error } = await supabase
      .from('titles')
      .insert([payload])
      .select('id, short_id');

    if (error) {
      setSubmitError(error.message);
      return;
    }

    const newUuid  = data[0].id;
    const newShort = data[0].short_id;

    // Insert into the matching subtype table
    try {
      switch(mediaType) {
        case 'Film': {
          const { error: filmErr } = await supabase
            .from('films')
            .insert([{ title_id: newUuid, total_duration: '00:00:00', content_rating_id: '1' }]);
          if (filmErr) throw filmErr;
          break;
        }
        case 'TV_Show': {
          const { error: showErr } = await supabase
            .from('tv_shows')
            .insert([{ title_id: newUuid, num_episodes: 0, duration_per_episode: '00:00:00' }]);
          if (showErr) throw showErr;
          break;
        }
        case 'Drama': {
          const { error: dramaErr } = await supabase
            .from('dramas')
            .insert([{ title_id: newUuid }]);
          if (dramaErr) throw dramaErr;
          break;
        }
        case 'Special': {
          const { error: specialErr } = await supabase
            .from('specials')
            .insert([{ title_id: newUuid }]);
          if (specialErr) throw specialErr;
          break;
        }
        case 'Short': {
          const { error: shortErr } = await supabase
            .from('shorts')
            .insert([{ title_id: newUuid }]);
          if (shortErr) throw shortErr;
          break;
        }
        case 'Manga': {
          const { error: mangaErr } = await supabase
            .from('manga')
            .insert([{ title_id: newUuid }]);
          if (mangaErr) throw mangaErr;
          break;
        }
        case 'Book': {
          const { error: bookErr } = await supabase
            .from('books')
            .insert([{ title_id: newUuid }]);
          if (bookErr) throw bookErr;
          break;
        }
        case 'Album': {
          const { error: albumErr } = await supabase
            .from('albums')
            .insert([{ title_id: newUuid }]);
          if (albumErr) throw albumErr;
          break;
        }
        case 'Song': {
          const { error: songErr } = await supabase
            .from('songs')
            .insert([{ title_id: newUuid, duration: '00:00:00' }]);
          if (songErr) throw songErr;
          break;
        }
        case 'TV_Segment': {
          const { error: segErr } = await supabase
            .from('tv_segments')
            .insert([{ title_id: newUuid, duration: '00:00:00' }]);
          if (segErr) throw segErr;
          break;
        }
        case 'Stage_Play': {
          const { error: playErr } = await supabase
            .from('stage_plays')
            .insert([{ title_id: newUuid, total_duration: '00:00:00' }]);
          if (playErr) throw playErr;
          break;
        }
        default:
          break;
      }
    } catch (subError) {
      // Roll back the title, since the film row failed
      await supabase.from('titles').delete().eq('id', newUuid);
      setSubmitError(subError.message);
      return;
    }

    // Navigate to the new title page
    navigate(`/titles/${newShort}`, { replace: true });
  };

  const mediaTypes = [
    'Film',
    'Drama',
    'Special',
    'Manga',
    'Book',
    'Album',
    'Song',
    'TV_Show',
    'TV_Segment',
    'Short',
    'Stage_Play'
  ];
  const statuses   = [
    'Unconfirmed',
    'Announced',
    'Not Yet Released',
    'Releasing',
    'Finished',
    'Cancelled'
  ];

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
            <span className="bio-join-date">
              Member since {joinedDate}
            </span>
            <Link
              className="view-public-profile-button"
              to={`/profile/${profile.username}`}
            >
              View Public Profile
            </Link>
          </div>
        </div>
        <div className="bio-nav">
          <Link to="/profile"><i className="ph ph-folder-simple-user"></i> <span className="nav-label">Update My Profile</span></Link>
          <Link to="/titles/add"><i className="ph ph-file-plus"></i> <span className="nav-label">Add A Title</span></Link>
          <Link to="/people/add"><i className="ph ph-file-plus"></i> <span className="nav-label">Add A Person</span></Link>
        </div>
      </section>

      <section id="right-content">
        <section id="topbar">
          <Link to="/"><i className="ph ph-house-line"></i>Home</Link>
          {profile && (
            <Link to="/dashboard"><i className="ph ph-chalkboard-teacher"></i>Dashboard</Link>
          )}

          <Link to="/titles"><i className="ph ph-files"></i>Titles</Link>
          
          <Link to="/people"><i className="ph ph-files"></i>People</Link>

          {profile && (
            <Link to={`/profile/${profile.username}`}><i className="ph ph-user"></i>Profile</Link>
          )}
          
          {profile && (
            <button onClick={handleLogout} className="log-button"><i className="ph ph-sign-out"></i>Log out</button>
          )}

          {!profile && (
            <Link to="/"><i className="ph ph-sign-in"></i>Log in</Link>
          )}
        </section>

        <section id="main-content">
          <div className="add-title-container">
            <span className="section-title">
              <i className="ph ph-file-plus"></i> Add A Title
            </span>

            <form className="add-title-form" onSubmit={handleSubmit}>
              <div className="form-layout">

                <div className="preview-box">
                  {coverUrl && (
                    <img
                      ref={imgRef}
                      src={coverUrl}
                      alt="Cover preview"
                      onLoad={handleImageLoad}
                      className={`${rotateImg ? 'rotated' : ''}${['Album','Song'].includes(mediaType) ? ' square' : ''}`}  
                    />
                  )}
                </div>

                <div className="form-fields">

                  <div className="form-row-two">
                    <div className="form-group">
                      <label>Media Type</label>
                      <select
                        value={mediaType}
                        onChange={handleMediaTypeChange}
                      >
                        {mediaTypes.map(t => (
                          <option key={t} value={t}>
                            {t.replace('_',' ')}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Status</label>
                      <select
                        value={status}
                        onChange={e => setStatus(e.target.value)}
                      >
                        {statuses.map(s => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Native Title</label>
                    <input
                      type="text"
                      value={nativeTitle}
                      onChange={e => setNativeTitle(e.target.value)}
                      required
                    />
                    <span>Title in original language (e.g. 進撃の巨人)</span>
                  </div>

                  <div className="form-group">
                    <label>Known As</label>
                    <input
                      type="text"
                      value={knownAs}
                      onChange={e => setKnownAs(e.target.value)}
                      required
                    />
                    <span>
                      If the romanji title is as popular as the English title, use romanji (e.g. Shingeki no Kyojin, not Attack on Titan)
                    </span>
                  </div>

                  <div className="form-group">
                    <label>Synopsis</label>
                    <textarea
                      value={synopsis}
                      onChange={e => setSynopsis(e.target.value)}
                    />
                    <span>May leave blank</span>
                  </div>

                  <div className="form-group">
                    <label>Cover Image URL</label>
                    <input
                      type="url"
                      value={coverUrl}
                      onChange={e => setCoverUrl(e.target.value)}
                    />
                    <span>
                      Enter a valid URL. If the image is wider than it is tall, it will auto-rotate
                    </span>
                  </div>

                  <div className="form-row-two">
                    <div className="form-group">
                      <label>Release Date</label>
                      <input
                        type="date"
                        value={releaseDate}
                        onChange={e => setReleaseDate(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label>End Date</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        disabled={['Film','Book','Song','Album','TV_Segment'].includes(mediaType)}
                      />
                      <span>If unknown, leave blank.</span>
                    </div>
                  </div>

                  {submitError && (
                    <p className="form-error">{submitError}</p>
                  )}

                  <button className="create-title-button" type="submit">
                    Add Title
                  </button>
                </div>
              </div>
            </form>
          </div>
        </section>
      </section>
    </div>
  );
}
