// src/pages/AddATitle.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link }           from 'react-router-dom';
import { supabase }                    from '../supabaseClient';
import defaultAvatar                   from '../assets/default avatar.jpg';

export default function AddATitle() {
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
        .from('Users')
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

  // Rotate image if width is > height
  const handleImageLoad = () => {
    const img = imgRef.current;
    if (img) setRotateImg(img.naturalWidth > img.naturalHeight);
  };

  // Insert into title table
  const handleSubmit = async e => {
    e.preventDefault();
    setSubmitError('');

    const payload = {
      type:             mediaType,
      native_title:     nativeTitle,
      known_as:         knownAs,
      synopsis,
      status,
      cover_image_url:  coverUrl,
      release_date:     releaseDate || null,
      end_date:         endDate || null,
    };

    // Ask Supabase to INSERT and return the new row's id
    const { data, error } = await supabase
      .from('titles')
      .insert([payload])
      .select('short_id');

    if (error) {
      setSubmitError(error.message);
    } else {
      const newId = data[0].id;
      navigate(`/title/${newShortId}`, { replace: true });
    }
  };

  const mediaTypes = ['Film','TV_Show','Drama','Special','Short','Manga','Book'];
  const statuses   = ['Unconfirmed','Announced','Not Yet Released','Releasing','Finished','Cancelled'];

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
      </section>

      <section id="right-content">
        <section id="topbar">
          <i className="ph ph-files"></i>
          <Link to="/dashboard">{profile.username}'s Dashboard</Link>
          <i className="ph ph-arrow-right"></i>
          <Link to="/addatitle">Add A Title</Link>
        </section>

        <section id="main-content">
          <div className="add-title-container">
            <span className="section-title">
              <i className="ph ph-hard-drives"></i> Add A Title
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
                      className={rotateImg ? 'rotated' : ''}
                    />
                  )}
                </div>

                <div className="form-fields">

                  <div className="form-row-two">
                    <div className="form-group">
                      <label>Media Type</label>
                      <select
                        value={mediaType}
                        onChange={e => setMediaType(e.target.value)}
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
                      If the romanji title is as popular as the English title, use romanji (e.g. Shingeki no Kyojin).
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
                      Enter a valid URL. If the image is wider than it is tall, it will auto-rotate.
                    </span>
                  </div>

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
                    />
                    <span>If unknown, leave blank</span>
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
