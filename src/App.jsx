import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const API = 'https://r-gengpt-api.vercel.app/api/video/download';
const HISTORY = 'dl_history';

/* ── Storage helpers ──────────────────────────────────────────── */
function storageGet(key, fallback = null) {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}
function storageSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* unavailable */ }
}
function readHistory() {
  try {
    const v = JSON.parse(storageGet(HISTORY, '[]'));
    return Array.isArray(v) ? v.slice(0, 10) : [];
  } catch { return []; }
}

/* ── Utility helpers ──────────────────────────────────────────── */
function thumb(url, fallback) {
  const match = url?.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([\w-]{11})/i);
  if (fallback && !fallback.includes('placeholder') && !fallback.includes('3dots')) return fallback;
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : 'https://picsum.photos/seed/media/600/340';
}
function formats(data) { return (data?.medias || data?.formats || []).filter((i) => i?.url); }
function duration(value) {
  if (!Number.isFinite(Number(value)) || Number(value) <= 0) return '00:00';
  return `${String(Math.floor(value / 60)).padStart(2,'0')}:${String(Math.floor(value % 60)).padStart(2,'0')}`;
}
function ago(value) {
  const s = Math.max(0, (Date.now() - new Date(value).getTime()) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

function detectPlatform(value) {
  if (!value) return null;
  try {
    const raw = value.trim();
    if (!raw.includes('.')) return null;
    const testUrl = raw.startsWith('http') ? raw : `https://${raw}`;
    const host = new URL(testUrl).hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtu.be') return 'youtube';
    if (host === 'tiktok.com'  || host.endsWith('.tiktok.com'))                         return 'tiktok';
    if (host === 'facebook.com'|| host.endsWith('.facebook.com')|| host === 'fb.watch') return 'facebook';
    if (host === 'instagram.com'||host.endsWith('.instagram.com'))                      return 'instagram';
    if (host === 'twitter.com' || host === 'x.com' || host.endsWith('.x.com'))          return 'x';
    return 'other';
  } catch { return null; }
}

const platformNames = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  instagram: 'Instagram',
};

const FAQ_ITEMS = [
  {
    q: 'Is SnapDown completely free to use?',
    a: 'Yes, SnapDown is 100% free forever. There are no subscriptions, hidden paywalls, or daily download restrictions.',
  },
  {
    q: 'Do I need to create an account or install software?',
    a: 'No registration, email, or app installation is required. Everything runs entirely in your desktop or mobile browser.',
  },
  {
    q: 'Does SnapDown remove watermarks from TikTok videos?',
    a: 'Yes! SnapDown extracts the clean original video directly from the CDN without the bouncing TikTok watermark.',
  },
  {
    q: 'Can I convert and extract YouTube videos to MP3?',
    a: 'Yes, our audio extraction engine isolates the audio stream and lets you download clean MP3 files in high bitrate.',
  },
  {
    q: 'Where are downloaded files saved on my device?',
    a: 'Files are saved to your default system "Downloads" directory, or to your Photos library on mobile devices.',
  },
  {
    q: 'What video resolutions are supported?',
    a: 'SnapDown supports all available source formats: 4K UHD (2160p), 2K QHD (1440p), 1080p Full HD, 720p HD, and standard definitions.',
  },
  {
    q: 'Is it safe and private to download with SnapDown?',
    a: 'Absolutely. We do not store your media on our servers or track what you download. Download history stays strictly in your local device cache.',
  },
];

/* ── Header Component ─────────────────────────────────────────── */
function SiteHeader({ path, navigate, theme, setTheme, setSettingsOpen, setDrawerOpen }) {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <a href="/" className="brand" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
          <div className="brand-icon">
            <img src="/icon.png" alt="SnapDown Logo" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          </div>
          Snap<span className="grad-text">Down</span>
        </a>

        <nav className="main-nav">
          <ul>
            <li>
              <a
                href="/"
                className={`nav-link ${path === '/' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); navigate('/'); }}
              >
                Home
              </a>
            </li>
            <li>
              <a
                href="/features"
                className={`nav-link ${path === '/features' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); navigate('/features'); }}
              >
                Features
              </a>
            </li>
            <li>
              <a
                href="/how-it-works"
                className={`nav-link ${path === '/how-it-works' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); navigate('/how-it-works'); }}
              >
                How It Works
              </a>
            </li>
            <li className="nav-dropdown">
              <a
                href="/platforms"
                className={`nav-link ${path === '/platforms' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); navigate('/platforms'); }}
              >
                Platforms <i className="fa-solid fa-chevron-down icon-chevron-sm"></i>
              </a>
              <ul className="dropdown-menu">
                <li><a href="/youtube-video-downloader" onClick={(e) => { e.preventDefault(); navigate('/youtube-video-downloader'); }}>YouTube Downloader</a></li>
                <li><a href="/tiktok-video-downloader" onClick={(e) => { e.preventDefault(); navigate('/tiktok-video-downloader'); }}>TikTok Downloader</a></li>
                <li><a href="/facebook-video-downloader" onClick={(e) => { e.preventDefault(); navigate('/facebook-video-downloader'); }}>Facebook Downloader</a></li>
                <li><a href="/instagram-video-downloader" onClick={(e) => { e.preventDefault(); navigate('/instagram-video-downloader'); }}>Instagram Downloader</a></li>
              </ul>
            </li>
            <li>
              <a
                href="/faq"
                className={`nav-link ${path === '/faq' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); navigate('/faq'); }}
              >
                FAQ
              </a>
            </li>
            <li>
              <a
                href="/about"
                className={`nav-link ${path === '/about' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); navigate('/about'); }}
              >
                About
              </a>
            </li>
          </ul>
        </nav>

        <div className="header-actions">
          <button
            className="icon-btn"
            id="themeToggleBtn"
            title="Toggle theme"
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === 'dark-theme' ? 'light-theme' : 'dark-theme')}
          >
            <svg className="icon-sun" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm0 1a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707L4.464 3.757a.5.5 0 0 1 0 .708z" />
            </svg>
            <svg className="icon-moon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
              <path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z" />
            </svg>
          </button>

          <button
            className="icon-btn"
            id="settingsBtn"
            title="Settings"
            aria-label="Settings"
            onClick={() => setSettingsOpen(true)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z" />
              <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z" />
            </svg>
          </button>

          <a href="/" className="btn-cta" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
            Start Downloading
          </a>

          <button
            className="icon-btn menu-toggle"
            id="menuToggle"
            aria-label="Open menu"
            onClick={() => setDrawerOpen(true)}
          >
            <i className="fa-solid fa-bars"></i>
          </button>
        </div>
      </div>
    </header>
  );
}

/* ── Footer Component ─────────────────────────────────────────── */
function SiteFooter({ navigate }) {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <a href="/" className="brand" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
              <div className="brand-icon">
                <img src="/icon.png" alt="SnapDown Logo" />
              </div>
              Snap<span className="grad-text">Down</span>
            </a>
            <p>Download video and audio from popular platforms effortlessly. Free, private, and unlimited.</p>
            <div className="social-icons">
              <a href="#" aria-label="Facebook"><i className="fa-brands fa-facebook-f"></i></a>
              <a href="#" aria-label="YouTube"><i className="fa-brands fa-youtube"></i></a>
              <a href="#" aria-label="TikTok"><i className="fa-brands fa-tiktok"></i></a>
              <a href="#" aria-label="Telegram"><i className="fa-brands fa-telegram"></i></a>
            </div>
          </div>

          <div className="footer-col">
            <h4>Navigation</h4>
            <ul>
              <li><a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }}>Home</a></li>
              <li><a href="/features" onClick={(e) => { e.preventDefault(); navigate('/features'); }}>Features</a></li>
              <li><a href="/how-it-works" onClick={(e) => { e.preventDefault(); navigate('/how-it-works'); }}>How It Works</a></li>
              <li><a href="/platforms" onClick={(e) => { e.preventDefault(); navigate('/platforms'); }}>Platforms</a></li>
              <li><a href="/faq" onClick={(e) => { e.preventDefault(); navigate('/faq'); }}>FAQ</a></li>
              <li><a href="/about" onClick={(e) => { e.preventDefault(); navigate('/about'); }}>About</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Downloaders</h4>
            <ul>
              <li><a href="/youtube-video-downloader" onClick={(e) => { e.preventDefault(); navigate('/youtube-video-downloader'); }}>YouTube Downloader</a></li>
              <li><a href="/tiktok-video-downloader" onClick={(e) => { e.preventDefault(); navigate('/tiktok-video-downloader'); }}>TikTok Downloader</a></li>
              <li><a href="/facebook-video-downloader" onClick={(e) => { e.preventDefault(); navigate('/facebook-video-downloader'); }}>Facebook Downloader</a></li>
              <li><a href="/instagram-video-downloader" onClick={(e) => { e.preventDefault(); navigate('/instagram-video-downloader'); }}>Instagram Downloader</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Legal &amp; Support</h4>
            <ul>
              <li><a href="/about" onClick={(e) => { e.preventDefault(); navigate('/about'); }}>About Us</a></li>
              <li><a href="/privacy" onClick={(e) => { e.preventDefault(); navigate('/privacy'); }}>Privacy Policy</a></li>
              <li><a href="/terms" onClick={(e) => { e.preventDefault(); navigate('/terms'); }}>Terms of Service</a></li>
              <li><a href="mailto:support@snapdown.online"><i className="fa-solid fa-envelope"></i> Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <div>&copy; {new Date().getFullYear()} <span className="accent">SnapDown</span>. All rights reserved.</div>
          <div>Designed for speed, privacy &amp; clean media downloading.</div>
        </div>
      </div>
    </footer>
  );
}

/* ── Main App with Multi-Page Routing ─────────────────────────── */
export default function App() {
  const [path, setPath]             = useState(() => window.location.pathname.replace(/\/+$/, '').toLowerCase() || '/');
  const initialUrl                  = new URLSearchParams(window.location.search).get('url') || '';

  const [url, setUrl]               = useState(initialUrl);
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(false);
  const [tab, setTab]               = useState('video');
  const [history, setHistory]       = useState(readHistory);
  const [theme, setTheme]           = useState(() => storageGet('theme', 'dark-theme'));
  const [saveHistory, setSaveHistory] = useState(() => storageGet('saveHistory', 'true') !== 'false');
  const [toast, setToast]           = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openFaq, setOpenFaq]       = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isPlaying, setIsPlaying]   = useState(false);
  const [playerActive, setPlayerActive] = useState(false);

  const videoRef = useRef(null);

  // Client-side navigation handler
  const navigate = useCallback((to) => {
    window.history.pushState({}, '', to);
    setPath(to.replace(/\/+$/, '').toLowerCase() || '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setDrawerOpen(false);
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setPath(window.location.pathname.replace(/\/+$/, '').toLowerCase() || '/');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    document.body.classList.remove('dark-theme', 'light-theme');
    document.body.classList.add(theme);
    storageSet('theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 3600);
    return () => clearTimeout(t);
  }, [toast]);

  const notify = useCallback((message, type = 'success') => setToast({ message, type }), []);
  const persist = useCallback((items) => {
    setHistory(items);
    storageSet(HISTORY, JSON.stringify(items));
  }, []);

  const platform = Object.keys(platformNames).find((key) => path.includes(key)) || null;

  const fetchData = useCallback(async (forcedUrl) => {
    const rawUrl = forcedUrl || url;
    const clean = rawUrl.trim();
    if (!clean) {
      notify('Please enter or paste a video link.', 'error');
      return;
    }

    let parsed;
    try {
      parsed = new URL(clean.startsWith('http') ? clean : `https://${clean}`);
    } catch {
      notify('Please enter a valid video URL.', 'error');
      return;
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      notify('URL must start with http:// or https://.', 'error');
      return;
    }

    setLoading(true);
    setData(null);
    setPlayerActive(false);
    setIsPlaying(false);

    try {
      const response = await fetch(`${API}?url=${encodeURIComponent(clean)}`);
      const payload  = await response.json();
      if (!response.ok) throw new Error(payload.message || `Request failed (${response.status})`);
      const result = payload.data || payload;
      if (!formats(result).length) throw new Error('No downloadable formats were found.');

      setData({ ...result, sourceUrl: clean });
      if (saveHistory) {
        persist([
          {
            url: clean,
            title: result.title || 'Untitled video',
            thumbnail: thumb(clean, result.thumbnail),
            time: new Date().toISOString(),
          },
          ...history.filter((i) => i.url !== clean),
        ].slice(0, 10));
      }
      notify('Media streams loaded successfully!');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Unable to process this URL.', 'error');
    } finally {
      setLoading(false);
    }
  }, [history, notify, persist, saveHistory, url]);

  useEffect(() => {
    if (initialUrl && !data) {
      fetchData(initialUrl);
    }
  }, []);

  const download = useCallback(async (source, ext) => {
    const safeTitle = (data?.title || 'snapdown-video')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 50);
    const endpoint = `/api/download?url=${encodeURIComponent(source)}&filename=${encodeURIComponent(`${safeTitle}.${ext || 'mp4'}`)}`;

    try {
      notify('Starting download… Please check your downloads folder.');
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = endpoint;
      document.body.appendChild(iframe);
      setTimeout(() => iframe.remove(), 60000);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Unable to download this file.', 'error');
    }
  }, [data, notify]);

  const allFormats = useMemo(() => formats(data), [data]);
  const videoFormats = useMemo(() => allFormats.filter((i) => i.type === 'video' || i.mimeType?.includes('video') || i.ext === 'mp4' || i.height), [allFormats]);
  const audioFormats = useMemo(() => allFormats.filter((i) => !videoFormats.includes(i)), [allFormats, videoFormats]);
  const currentPreviewUrl = videoFormats[0]?.url || allFormats[0]?.url || '';

  const toggleInlinePlayer = () => {
    if (!playerActive) {
      setPlayerActive(true);
      if (videoRef.current) {
        videoRef.current.src = currentPreviewUrl;
        videoRef.current.play();
        setIsPlaying(true);
      }
    } else {
      if (videoRef.current) {
        if (videoRef.current.paused) {
          videoRef.current.play();
          setIsPlaying(true);
        } else {
          videoRef.current.pause();
          setIsPlaying(false);
        }
      }
    }
  };

  const currentPlatformTitle = platform ? platformNames[platform] : null;

  /* ── Search tool component ── */
  const renderDownloaderTool = (customTitle, customSub) => (
    <section className="hero" id="home">
      <div className="container">
        <div className="hero-badge">
          <span className="dot-pulse"></span>
          <span>{customTitle ? `${customTitle} Downloader` : '100% Free · No Limits · No Watermark'}</span>
        </div>

        <h1>
          {customTitle ? (
            <>
              Download <span className="grad-text">{customTitle}</span> Videos
            </>
          ) : (
            <>
              Download <span className="grad-text">Any Video</span>.<br />
              Fast, Free &amp; Private.
            </>
          )}
        </h1>

        <p className="hero-sub">
          {customSub || 'Save videos from YouTube, TikTok, Facebook, Instagram and X in HD, 1080p, 4K or MP3 audio.'}
        </p>

        <div className="tool-shell">
          <div className="search-wrapper">
            <div className="search-box">
              <div className="search-icon">
                <i className="fa-solid fa-link"></i>
              </div>
              <input
                className="search-input"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchData()}
                placeholder={
                  customTitle
                    ? `Paste ${customTitle} link here (e.g. https://${customTitle.toLowerCase()}.com/...)`
                    : 'Paste video link here (YouTube, TikTok, Facebook, IG)...'
                }
                aria-label="Video link input"
                spellCheck="false"
                autoComplete="off"
              />

              <div className="search-actions">
                {url && (
                  <button
                    className="action-btn"
                    type="button"
                    onClick={() => setUrl('')}
                    title="Clear input"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                )}
                <button
                  className="action-btn"
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.readText()
                      .then((text) => {
                        setUrl(text);
                        notify('Link pasted from clipboard!');
                      })
                      .catch(() => notify('Clipboard permission was denied.', 'error'));
                  }}
                  title="Paste from clipboard"
                >
                  <i className="fa-regular fa-clipboard"></i>
                </button>
              </div>

              <button
                className="btn-search"
                type="button"
                disabled={loading}
                onClick={() => fetchData()}
              >
                {loading ? (
                  <>
                    <span className="spinner" />
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <span>Download</span>
                    <i className="fa-solid fa-arrow-right"></i>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="platform-strip">
            <span>SUPPORTED PLATFORMS</span>
            <div className="platform-icons">
              <a href="/youtube-video-downloader" onClick={(e) => { e.preventDefault(); navigate('/youtube-video-downloader'); }}><i className="fa-brands fa-youtube brand-yt" title="YouTube"></i></a>
              <a href="/tiktok-video-downloader" onClick={(e) => { e.preventDefault(); navigate('/tiktok-video-downloader'); }}><i className="fa-brands fa-tiktok brand-tt" title="TikTok"></i></a>
              <a href="/facebook-video-downloader" onClick={(e) => { e.preventDefault(); navigate('/facebook-video-downloader'); }}><i className="fa-brands fa-facebook-f brand-fb" title="Facebook"></i></a>
              <a href="/instagram-video-downloader" onClick={(e) => { e.preventDefault(); navigate('/instagram-video-downloader'); }}><i className="fa-brands fa-instagram brand-ig" title="Instagram"></i></a>
              <a href="/platforms" onClick={(e) => { e.preventDefault(); navigate('/platforms'); }}><i className="fa-brands fa-x-twitter brand-x" title="X / Twitter"></i></a>
            </div>
          </div>

          {loading && (
            <div className="skeleton-loader active">
              <div className="skel-card" />
              <div className="skel-text-group">
                <div className="skel-line w-80" />
                <div className="skel-line w-60" />
                <div className="skel-line w-40" />
              </div>
            </div>
          )}

          {data && (
            <div id="result-area">
              <div className="video-card">
                <div className="thumb-wrap" onClick={toggleInlinePlayer}>
                  <img
                    className="video-thumb"
                    src={thumb(data.sourceUrl, data.thumbnail || data.thumb)}
                    alt={data.title || 'Thumbnail'}
                    onError={(e) => { e.currentTarget.src = 'https://picsum.photos/seed/fallback/600/340'; }}
                  />
                  <div className="play-overlay">
                    <div className="play-overlay-btn">
                      <svg width="24" height="24" fill="white" viewBox="0 0 16 16">
                        <path d="M11.596 8.697l-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/>
                      </svg>
                    </div>
                  </div>
                  <span className="video-duration">{duration(data.duration)}</span>
                </div>

                <div className={`custom-player-wrap ${playerActive ? 'active' : ''}`}>
                  <video ref={videoRef} playsInline preload="metadata" />
                  <div className="cp-controls">
                    <div className="cp-bottom">
                      <button className="cp-btn" type="button" onClick={toggleInlinePlayer} title="Play/Pause">
                        <svg width="20" height="20" fill="white" viewBox="0 0 16 16">
                          {isPlaying ? (
                            <path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z"/>
                          ) : (
                            <path d="M11.596 8.697l-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/>
                          )}
                        </svg>
                      </button>
                      <span className="cp-time">{duration(data.duration)}</span>
                      <div className="cp-spacer"></div>
                      <button
                        className="cp-btn"
                        type="button"
                        onClick={() => {
                          if (videoRef.current) {
                            videoRef.current.pause();
                            setPlayerActive(false);
                            setIsPlaying(false);
                          }
                        }}
                        title="Close player"
                      >
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="card-body">
                  <h2 className="video-title">{data.title || 'Untitled media'}</h2>
                  <div className="video-meta">
                    <span>{data.source || 'Online Stream'}</span>
                    <span className="text-primary-bold">HD Available</span>
                  </div>
                </div>
              </div>

              <div className="tabs-nav">
                <button
                  className={`tab-btn ${tab === 'video' ? 'active' : ''}`}
                  type="button"
                  onClick={() => setTab('video')}
                >
                  Video ({videoFormats.length})
                </button>
                <button
                  className={`tab-btn ${tab === 'audio' ? 'active' : ''}`}
                  type="button"
                  onClick={() => setTab('audio')}
                >
                  Audio ({audioFormats.length})
                </button>
              </div>

              <div className="format-list">
                {(tab === 'video' ? videoFormats : audioFormats).map((item, i) => {
                  const isVid = item.type === 'video' || item.mimeType?.includes('video') || item.ext === 'mp4' || item.height;
                  const ext = (item.ext || (isVid ? 'mp4' : 'mp3')).toLowerCase();
                  const quality = item.quality || (item.height ? `${item.height}p` : 'HQ');
                  return (
                    <div className="format-item" key={`${item.url}-${i}`}>
                      <div className="format-info">
                        <h4>{quality}{item.size ? ` (${item.size})` : ''}</h4>
                        <span>{ext.toUpperCase()}</span>
                      </div>
                      <div className="format-actions">
                        <button
                          className="dl-btn"
                          type="button"
                          onClick={() => download(item.url, ext)}
                        >
                          <i className="fa-solid fa-download"></i>
                          <span>Download</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );

  return (
    <div className="app-shell">
      {/* Toast */}
      {toast && (
        <div id="toast-container">
          <div className={`toast ${toast.type}`}>
            <i className={`fa-solid ${toast.type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'}`}></i>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Mobile Drawer */}
      <div
        className={`drawer-overlay ${drawerOpen ? 'active' : ''}`}
        onClick={() => setDrawerOpen(false)}
      />
      <div className={`mobile-drawer ${drawerOpen ? 'active' : ''}`}>
        <div className="drawer-top">
          <button className="icon-btn" onClick={() => setDrawerOpen(false)} aria-label="Close menu">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        <nav>
          <ul>
            <li><a href="/" className="drawer-link" onClick={(e) => { e.preventDefault(); navigate('/'); }}>Home</a></li>
            <li><a href="/features" className="drawer-link" onClick={(e) => { e.preventDefault(); navigate('/features'); }}>Features</a></li>
            <li><a href="/how-it-works" className="drawer-link" onClick={(e) => { e.preventDefault(); navigate('/how-it-works'); }}>How It Works</a></li>
            <li><a href="/platforms" className="drawer-link" onClick={(e) => { e.preventDefault(); navigate('/platforms'); }}>Platforms</a></li>
            <li><a href="/youtube-video-downloader" className="drawer-link" onClick={(e) => { e.preventDefault(); navigate('/youtube-video-downloader'); }}>YouTube</a></li>
            <li><a href="/tiktok-video-downloader" className="drawer-link" onClick={(e) => { e.preventDefault(); navigate('/tiktok-video-downloader'); }}>TikTok</a></li>
            <li><a href="/facebook-video-downloader" className="drawer-link" onClick={(e) => { e.preventDefault(); navigate('/facebook-video-downloader'); }}>Facebook</a></li>
            <li><a href="/instagram-video-downloader" className="drawer-link" onClick={(e) => { e.preventDefault(); navigate('/instagram-video-downloader'); }}>Instagram</a></li>
            <li><a href="/faq" className="drawer-link" onClick={(e) => { e.preventDefault(); navigate('/faq'); }}>FAQ</a></li>
            <li><a href="/about" className="drawer-link" onClick={(e) => { e.preventDefault(); navigate('/about'); }}>About</a></li>
          </ul>
        </nav>
        <div className="drawer-social">
          <a href="#" className="icon-btn" aria-label="Facebook"><i className="fa-brands fa-facebook-f"></i></a>
          <a href="#" className="icon-btn" aria-label="YouTube"><i className="fa-brands fa-youtube"></i></a>
          <a href="#" className="icon-btn" aria-label="TikTok"><i className="fa-brands fa-tiktok"></i></a>
          <a href="#" className="icon-btn" aria-label="Telegram"><i className="fa-brands fa-telegram"></i></a>
        </div>
      </div>

      <SiteHeader
        path={path}
        navigate={navigate}
        theme={theme}
        setTheme={setTheme}
        setSettingsOpen={setSettingsOpen}
        setDrawerOpen={setDrawerOpen}
      />

      {/* ── ROUTE DISPATCH: Render Different Dedicated Pages ── */}

      {/* 1. FEATURES PAGE */}
      {path === '/features' && (
        <main>
          <section className="section">
            <div className="container">
              <div className="section-head-center">
                <span className="eyebrow">FEATURES &amp; HIGHLIGHTS</span>
                <h2>Built for speed, not friction</h2>
                <p>Everything you need from a downloader, nothing you don't. No annoying popups or bloated software.</p>
              </div>

              <div className="features-grid">
                <div className="feature-card">
                  <div className="feature-icon"><i className="fa-solid fa-bolt"></i></div>
                  <h3>Lightning Fast Extraction</h3>
                  <p>Stream links are parsed and ready in seconds so you get straight to your file without waiting.</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon"><i className="fa-solid fa-film"></i></div>
                  <h3>Ultra HD Quality</h3>
                  <p>Grab the highest available resolution directly from source servers, from 360p up to 4K 60fps.</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon"><i className="fa-solid fa-droplet-slash"></i></div>
                  <h3>Watermark Free</h3>
                  <p>Save clean videos without intrusive overlays, logos, or bouncing platform watermarks.</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon"><i className="fa-solid fa-user-slash"></i></div>
                  <h3>No Account or Signup</h3>
                  <p>No registration, email, or passwords required. Complete privacy for every single download.</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon"><i className="fa-solid fa-music"></i></div>
                  <h3>MP3 Audio Extraction</h3>
                  <p>Isolate and download standalone high-bitrate audio when you only need the sound or soundtrack.</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon"><i className="fa-solid fa-mobile-screen-button"></i></div>
                  <h3>Works on Any Device</h3>
                  <p>100% responsive and tested across iPhone, iPad, Android, macOS, Windows, and Linux browsers.</p>
                </div>
              </div>

              <div className="section-head-center" style={{ marginTop: '70px', marginBottom: '30px' }}>
                <h2>Ready to download your favourite videos?</h2>
                <p>Paste any link on our home page and get your video or audio in seconds.</p>
                <div style={{ marginTop: '24px' }}>
                  <a href="/" className="btn-cta" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
                    Go to Downloader →
                  </a>
                </div>
              </div>
            </div>
          </section>
        </main>
      )}

      {/* 2. HOW IT WORKS PAGE */}
      {path === '/how-it-works' && (
        <main>
          <section className="section section-alt">
            <div className="container">
              <div className="section-head-center">
                <span className="eyebrow">HOW IT WORKS</span>
                <h2>Download in 3 simple steps</h2>
                <p>Simple, reliable, and completely effortless on all your devices.</p>
              </div>

              <div className="how-steps">
                <div className="how-step">
                  <span className="step-num">STEP 01</span>
                  <div className="step-icon-wrap">
                    <i className="fa-solid fa-copy"></i>
                  </div>
                  <h3>Copy Media Link</h3>
                  <p>Open YouTube, TikTok, Facebook, or Instagram, and copy the video, reel, or short URL.</p>
                </div>
                <div className="how-step">
                  <span className="step-num">STEP 02</span>
                  <div className="step-icon-wrap">
                    <i className="fa-solid fa-paste"></i>
                  </div>
                  <h3>Paste in SnapDown</h3>
                  <p>Paste your link into the SnapDown input box and click the Download button.</p>
                </div>
                <div className="how-step">
                  <span className="step-num">STEP 03</span>
                  <div className="step-icon-wrap">
                    <i className="fa-solid fa-cloud-arrow-down"></i>
                  </div>
                  <h3>Save to Device</h3>
                  <p>Select your desired format (MP4 video or MP3 audio) and save directly to your storage.</p>
                </div>
              </div>

              <div className="section-head-center" style={{ marginTop: '80px', marginBottom: '30px' }}>
                <span className="eyebrow">INSTANT TEST</span>
                <h2>Try it right now</h2>
                <p>Experience how fast and clean downloading can be.</p>
                <div style={{ marginTop: '24px' }}>
                  <a href="/" className="btn-cta" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
                    Start Downloading Now
                  </a>
                </div>
              </div>
            </div>
          </section>
        </main>
      )}

      {/* 3. PLATFORMS PAGE */}
      {path === '/platforms' && (
        <main>
          <section className="section">
            <div className="container">
              <div className="section-head-center">
                <span className="eyebrow">SUPPORTED PLATFORMS</span>
                <h2>Dedicated Social Media Downloaders</h2>
                <p>Choose your platform below to use our optimized dedicated downloader.</p>
              </div>

              <div className="platforms-grid">
                <a href="/youtube-video-downloader" className="platform-card card-yt" onClick={(e) => { e.preventDefault(); navigate('/youtube-video-downloader'); }}>
                  <i className="fa-brands fa-youtube"></i>
                  <h4>YouTube</h4>
                  <div className="platform-badges">
                    <span className="mini-badge">4K Video</span>
                    <span className="mini-badge">MP3 Audio</span>
                    <span className="mini-badge">Shorts</span>
                  </div>
                </a>
                <a href="/tiktok-video-downloader" className="platform-card card-tt" onClick={(e) => { e.preventDefault(); navigate('/tiktok-video-downloader'); }}>
                  <i className="fa-brands fa-tiktok"></i>
                  <h4>TikTok</h4>
                  <div className="platform-badges">
                    <span className="mini-badge">No Watermark</span>
                    <span className="mini-badge">Original Sound</span>
                  </div>
                </a>
                <a href="/facebook-video-downloader" className="platform-card card-fb" onClick={(e) => { e.preventDefault(); navigate('/facebook-video-downloader'); }}>
                  <i className="fa-brands fa-facebook-f"></i>
                  <h4>Facebook</h4>
                  <div className="platform-badges">
                    <span className="mini-badge">Reels</span>
                    <span className="mini-badge">HD Stream</span>
                  </div>
                </a>
                <a href="/instagram-video-downloader" className="platform-card card-ig" onClick={(e) => { e.preventDefault(); navigate('/instagram-video-downloader'); }}>
                  <i className="fa-brands fa-instagram"></i>
                  <h4>Instagram</h4>
                  <div className="platform-badges">
                    <span className="mini-badge">Reels</span>
                    <span className="mini-badge">Posts</span>
                    <span className="mini-badge">Stories</span>
                  </div>
                </a>
                <a href="/" className="platform-card card-x" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
                  <i className="fa-brands fa-x-twitter"></i>
                  <h4>X / Twitter</h4>
                  <div className="platform-badges">
                    <span className="mini-badge">MP4</span>
                    <span className="mini-badge">GIFs</span>
                  </div>
                </a>
              </div>
            </div>
          </section>
        </main>
      )}

      {/* 4. FAQ PAGE */}
      {path === '/faq' && (
        <main>
          <section className="section section-alt">
            <div className="container container-narrow">
              <div className="section-head-center">
                <span className="eyebrow">HELP &amp; ANSWERS</span>
                <h2>Frequently Asked Questions</h2>
                <p>Everything you need to know about using SnapDown, formats, and safety.</p>
              </div>

              <div className="faq-list">
                {FAQ_ITEMS.map((item, idx) => (
                  <div
                    key={item.q}
                    className={`faq-item ${openFaq === idx ? 'open' : ''}`}
                    onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}
                  >
                    <div className="faq-question">
                      <span>{item.q}</span>
                      <i className="fa-solid fa-chevron-down"></i>
                    </div>
                    <div className="faq-answer">
                      <div className="faq-answer-inner">
                        {item.a}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="section-head-center" style={{ marginTop: '60px' }}>
                <p>Still have a question or need assistance? Reach out to our team anytime at <a href="mailto:support@snapdown.online" style={{ color: 'var(--primary)', fontWeight: 600 }}>support@snapdown.online</a>.</p>
              </div>
            </div>
          </section>
        </main>
      )}

      {/* 5. ABOUT PAGE */}
      {['/about', '/about.html'].includes(path) && (
        <main>
          <section className="section" id="about">
            <div className="container">
              <div className="about-inner">
                <div className="about-text">
                  <span className="eyebrow">ABOUT SNAPDOWN</span>
                  <h2>Your fast, dependable media downloader</h2>
                  <p>SnapDown was built out of frustration with online downloaders that are cluttered with intrusive popups, deceptive links, and hidden paywalls. We wanted something clean, reliable, and respectful of your device and privacy.</p>
                  <p>No registration, no data tracking, no software installation. Just paste a link and get your file instantly.</p>
                  <div className="about-stats">
                    <div className="stat-item">
                      <strong>4K UHD</strong>
                      <span>Max Resolution</span>
                    </div>
                    <div className="stat-item">
                      <strong>0</strong>
                      <span>Signups Needed</span>
                    </div>
                    <div className="stat-item">
                      <strong>100%</strong>
                      <span>Free Forever</span>
                    </div>
                  </div>
                </div>

                <div className="about-visual">
                  <i className="fa-brands fa-youtube"></i>
                  <i className="fa-brands fa-tiktok"></i>
                  <i className="fa-brands fa-instagram"></i>
                  <i className="fa-brands fa-facebook-f"></i>
                  <i className="fa-brands fa-x-twitter"></i>
                </div>
              </div>
            </div>
          </section>
        </main>
      )}

      {/* 6. PRIVACY POLICY */}
      {['/privacy', '/privacy.html'].includes(path) && (
        <main>
          <section className="section">
            <div className="container container-narrow">
              <div className="section-head-center">
                <span className="eyebrow">LEGAL</span>
                <h2>Privacy Policy</h2>
                <p>Your privacy is our utmost priority.</p>
              </div>
              <div style={{ background: 'var(--bg-panel)', padding: '36px', borderRadius: '18px', border: '1px solid var(--border-color)', lineHeight: 1.8 }}>
                <h3 style={{ marginBottom: '12px' }}>Zero Tracking</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>SnapDown does not store personal information, require user accounts, or track download habits. All queries connect directly to upstream media decoders without profiling.</p>
                <h3 style={{ marginBottom: '12px' }}>Local Storage</h3>
                <p style={{ color: 'var(--text-muted)' }}>If you enable "Save download history" in preferences, links are saved solely inside your local web browser's LocalStorage and can be cleared at any time with one click.</p>
              </div>
            </div>
          </section>
        </main>
      )}

      {/* 7. TERMS OF SERVICE */}
      {['/terms', '/terms.html'].includes(path) && (
        <main>
          <section className="section">
            <div className="container container-narrow">
              <div className="section-head-center">
                <span className="eyebrow">LEGAL</span>
                <h2>Terms of Service</h2>
                <p>Please read these terms carefully before using SnapDown.</p>
              </div>
              <div style={{ background: 'var(--bg-panel)', padding: '36px', borderRadius: '18px', border: '1px solid var(--border-color)', lineHeight: 1.8 }}>
                <h3 style={{ marginBottom: '12px' }}>Authorized Use</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>SnapDown is provided for personal offline viewing of publicly accessible media. Users are responsible for complying with the copyright laws and terms of service of each origin platform.</p>
                <h3 style={{ marginBottom: '12px' }}>Disclaimer</h3>
                <p style={{ color: 'var(--text-muted)' }}>The service is provided on an "as-is" basis without warranties of any kind. Availability is subject to changes in origin platform endpoints.</p>
              </div>
            </div>
          </section>
        </main>
      )}

      {/* 8. PLATFORM DOWNLOADER PAGES (YouTube, TikTok, Facebook, Instagram) */}
      {platform && (
        <main>
          {renderDownloaderTool(
            currentPlatformTitle,
            `Save ${currentPlatformTitle} videos, shorts, reels, and audio tracks in high definition. No watermark, no signup needed.`
          )}
        </main>
      )}

      {/* 9. HOME PAGE (Default) */}
      {(path === '/' || path === '/home') && (
        <main>
          {renderDownloaderTool(null, null)}

          {/* Recent History on Home */}
          <section className="section section-alt history-section" id="history">
            <div className="container">
              <div className="section-head">
                <h3><i className="fa-solid fa-clock-rotate-left"></i> Recent Downloads</h3>
                {history.length > 0 && (
                  <button className="clear-btn" type="button" onClick={() => persist([])}>
                    Clear History
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="empty-history-msg">
                  No recent downloads saved yet. Paste a link to get started!
                </div>
              ) : (
                <div className="history-list">
                  {history.map((item) => (
                    <div
                      className="history-item"
                      key={`${item.url}-${item.time}`}
                      onClick={() => {
                        setUrl(item.url);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        notify('Loaded link into search box!');
                      }}
                    >
                      <img
                        className="h-thumb"
                        src={item.thumbnail}
                        alt=""
                        onError={(e) => { e.currentTarget.src = 'https://picsum.photos/seed/fallback/100/100'; }}
                      />
                      <div className="h-info">
                        <div className="h-title">{item.title}</div>
                        <div className="h-time">{ago(item.time)}</div>
                      </div>
                      <button
                        className="h-delete"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          persist(history.filter((i) => i.url !== item.url));
                        }}
                        title="Remove from history"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </main>
      )}

      <SiteFooter navigate={navigate} />

      {/* Back to Top */}
      <button
        className={`back-to-top ${showBackToTop ? 'show' : ''}`}
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Back to top"
      >
        <i className="fa-solid fa-arrow-up"></i>
      </button>

      {/* Settings Modal */}
      <div className={`modal-overlay ${settingsOpen ? 'active' : ''}`} onClick={(e) => e.target === e.currentTarget && setSettingsOpen(false)}>
        <div className="modal-box">
          <div className="modal-title">Settings</div>
          <div className="setting-row">
            <span>Save download history</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={saveHistory}
                onChange={(e) => {
                  setSaveHistory(e.target.checked);
                  storageSet('saveHistory', e.target.checked);
                  notify(`History tracking ${e.target.checked ? 'enabled' : 'disabled'}.`);
                }}
              />
              <span className="slider"></span>
            </label>
          </div>
          <div className="setting-row">
            <span>Dark mode</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={theme === 'dark-theme'}
                onChange={(e) => setTheme(e.target.checked ? 'dark-theme' : 'light-theme')}
              />
              <span className="slider"></span>
            </label>
          </div>
          <div className="modal-footer-center">
            <button className="btn-search btn-modal-close" type="button" onClick={() => setSettingsOpen(false)}>
              Close
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
