# 🎵 K-DLE

A daily K-Pop song guessing game inspired by Wordle. Listen to short audio clips and guess the artist and song title!

## ✨ Features

- **Daily Challenge**: New K-Pop song every day
- **Audio Snippets**: Listen to 5-second previews from Spotify
- **Progressive Hints**: Get more clues with each wrong guess
- **User Accounts**: Track your stats and streaks
- **Leaderboards**: Compete with other players
- **Social Sharing**: Share your results with friends
- **Volume Control**: Adjust audio levels while playing
- **Responsive Design**: Works on desktop and mobile

## 🚀 Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Google OAuth, Magic Links)
- **Audio**: Spotify Web API
- **Deployment**: Vercel
- **Security**: Rate limiting, CSP headers, RLS policies

## 🎮 How to Play

1. **Listen** to the daily K-Pop song snippet
2. **Guess** the artist and song title
3. **Get hints** after each incorrect guess
4. **Share** your results with friends
5. **Track** your streak and compete on leaderboards

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Spotify Developer account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/brianchiem/kdle.git
   cd kdle
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   ```
   
   Fill in your values:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   
   # Spotify API
   SPOTIFY_CLIENT_ID=your_spotify_client_id
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
   
   # Admin access
   ADMIN_EMAILS=your-email@example.com
   ```

4. **Set up the database**
   - Run the SQL from `docs/supabase-schema.sql` in your Supabase dashboard
   - This creates all necessary tables and RLS policies

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Visit** [http://localhost:3000](http://localhost:3000)

## 📊 Database Schema

The app uses PostgreSQL with the following main tables:

- `songs` - K-Pop song library with Spotify metadata
- `daily_song` - Daily challenge schedule
- `user_profiles` - User information and usernames
- `user_stats` - Player statistics and streaks
- `game_results` - Individual game sessions and guesses

## 🔐 Security Features

- **Row Level Security (RLS)** on all database tables
- **Rate limiting** on API endpoints
- **Content Security Policy (CSP)** headers
- **Input validation** and sanitization
- **Admin-only** routes for content management

## 🚀 Deployment

The app is deployed on Vercel with automatic deployments from the main branch.

### Environment Variables (Production)

Set these in your Vercel dashboard:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=https://your-domain.vercel.app/api/spotify/callback
ADMIN_EMAILS=your-email@example.com
NEXT_PUBLIC_APP_NAME=K-DLE
DAILY_RESET_TZ=UTC
```

## 🎵 Adding Songs

Use the admin panel (accessible to admin emails) to:

1. **Search** for K-Pop songs via Spotify API
2. **Add** songs to your library
3. **Schedule** daily challenges
4. **View** analytics and user engagement

## 📱 Features in Detail

### Game Mechanics
- 6 maximum guesses per day
- Progressive hint system (year, album art, etc.)
- Streak tracking and statistics
- Win rate calculations

### Social Features
- Leaderboards by streak, wins, and win rate
- Social sharing with emoji results
- User profiles and usernames

### Audio System
- Spotify integration for high-quality previews
- Volume control during playback
- Fallback preview finding for missing tracks

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is for educational and personal use. Spotify integration requires proper API credentials and adherence to Spotify's terms of service.

## 🙏 Acknowledgments

- Inspired by [Wordle](https://www.nytimes.com/games/wordle/index.html)
- Built with [Next.js](https://nextjs.org/)
- Powered by [Supabase](https://supabase.com/)
- Audio from [Spotify Web API](https://developer.spotify.com/)
