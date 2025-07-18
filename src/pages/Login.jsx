// src/pages/Dashboard.jsx
import { useState, useEffect }    from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase }    from '../supabaseClient';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const navigate = useNavigate();

  // If already logged in, redirect to dashboard
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/dashboard', { replace: true });
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }

    // Lookup the real email for this username
    const { data: usr, error: lookupErr } = await supabase
      .from('users')
      .select('email')
      .eq('username', username.trim())
      .single();

    if (lookupErr || !usr?.email) {
      setError('Invalid username or password.');
      return;
    }

    // Sign in via Supabase Auth
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email:    usr.email,
      password,
    });

    if (authErr) {
      setError('Invalid username or password.');
    } else {
      // If successful, send them to their private dashboard
      navigate('/dashboard', { replace: true });
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          autoFocus
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <button type="submit">Login</button>
        {error && <p className="login-error">{error}</p>}
      </form>
    </div>
  );
}
