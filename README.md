# SnapDown — Free Online Video & Audio Downloader

> **Download Any Video. Anywhere. Instantly.**  
> Fast, privacy-focused media downloader supporting YouTube, TikTok, Facebook, Instagram, and X (Twitter) in high definition up to 4K and crystal clear MP3 audio.

---

## ⚡ Features

- **🚀 Lightning Fast**: Instant stream extraction and direct downloads without waiting queues.
- **✨ No Watermarks**: Clean video extraction for TikTok, Reels, and Shorts without platform logos.
- **🎥 Up to 4K UHD & MP3**: Download MP4 in 4K, 2K, 1080p, 720p, or isolate audio into high-bitrate MP3.
- **🔒 100% Private**: No signups, no email required, and no user tracking. Download history is kept strictly in local browser storage.
- **📱 Cross-Platform Responsive**: Designed with modern cyber-glass aesthetics and full mobile, tablet, and desktop responsiveness.
- **🌓 Dark & Light Themes**: Seamless toggle between obsidian dark and clean light mode.
- **▶️ In-App Preview Player**: Play and inspect videos directly before downloading.

---

## 🌐 Supported Platforms

| Platform | Capabilities |
| :--- | :--- |
| **YouTube** | Videos, Shorts, MP3 Audio, 1080p, 1440p, 4K |
| **TikTok** | Watermark-free HD MP4, Original Sound / Audio |
| **Facebook** | Public Videos, Reels, HD Quality |
| **Instagram** | Reels, Stories, Video Posts |
| **X (Twitter)** | Videos, MP4 Streams, GIFs |

---

## 🛠️ Tech Stack

- **Frontend**: [React 19](https://react.dev/), [Vite](https://vitejs.dev/)
- **Styling**: Vanilla CSS (Custom Design System with Space Grotesk, Inter & JetBrains Mono)
- **Icons**: FontAwesome 6
- **Server / Proxy**: Node.js HTTP proxy (`server.mjs`) for local development & Vercel Serverless Function (`api/download.js`) for production
- **Deployment**: [Vercel](https://vercel.com/) with native SPA route rewrites in `vercel.json`

---

## 📂 Project Structure

```text
SpanDown/
├── api/
│   └── download.js          # Vercel Serverless Function for media proxying
├── public/
│   └── icon.png             # Application favicon and logo asset
├── src/
│   ├── App.jsx              # Main React SPA with multi-page routing
│   ├── app.css              # Complete design system and styling
│   └── main.jsx             # React DOM entry point
├── dist/                    # Production build output
├── index.html               # Main HTML template with Google Fonts & FontAwesome
├── package.json             # Dependencies and build scripts
├── robots.txt               # SEO crawler guidelines
├── server.mjs               # Local development server with proxying
├── sitemap.xml              # SEO search engine sitemap
├── vercel.json              # Vercel configuration for SPA routing & API
└── vite.config.js           # Vite configuration
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v20.x or higher
- **npm**: v10.x or higher

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/peak-brosmao/SpanDown.online-Download-Any-Video.-Anywhere.-Instantly..git
   cd SpanDown.online-Download-Any-Video.-Anywhere.-Instantly.
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start local development server**:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5173`.

4. **Build for production**:
   ```bash
   npm run build
   ```

---

## ☁️ Deployment on Vercel

The project is pre-configured with `vercel.json` to handle:
- **SPA Client-Side Routing**: Direct links like `/how-it-works`, `/features`, `/platforms`, `/faq`, and `/about` automatically resolve to `index.html`.
- **Media Streaming API**: `/api/download` routes to the serverless function `api/download.js` to deliver files with proper `Content-Disposition: attachment` headers.

To deploy via Vercel CLI:
```bash
npx vercel
```
Or connect your GitHub repository directly in the [Vercel Dashboard](https://vercel.com/dashboard).

---

## 📜 Disclaimer

SnapDown is intended solely for personal offline backup of publicly accessible media that you own or have explicit authorization to download. Please respect creators' rights, intellectual property, and each origin platform's Terms of Service.

---

## 📄 License

This project is licensed under the MIT License.
