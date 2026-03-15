# HabitFlow – Social Habit Tracking Platform

A full-stack social habit tracking app built with the MEAN stack. Users can track daily habits, connect with people who share similar goals, and stay motivated through a live community feed.

## Features

- Email + password authentication
- Habit tracking with streak counting and completion rates
- Auto-posts to community feed when you complete a habit
- Goal-based groups with live member activity feed
- Find people with similar goals and send connection requests
- Leaderboard of top streaks across the platform
- AI coach motivational messages based on your progress
- Dashboard analytics (total, completed, pending, top streak)
- WhatsApp reminders via Twilio (optional)

## Tech Stack

- **Frontend:** Angular 21 (standalone components, signals)
- **Backend:** Node.js + Express 4
- **Database:** MongoDB Atlas + Mongoose
- **Deployment:** Render (API) + Netlify (frontend)

## Project Structure

```
MEAN project/
├── backend/        # Node.js + Express API
└── frontend/       # Angular app
```

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas account

### Backend
```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` folder:
```
PORT=3001
MONGO_URI=your_mongodb_atlas_connection_string
NODE_ENV=development
```

```bash
node server.js
```

### Frontend
```bash
cd frontend
npm install
npm start
```

App runs at `http://localhost:4200`

## Deployment

### Backend → Render
- Connect GitHub repo on [render.com](https://render.com)
- Root directory: `backend`
- Build command: `npm install`
- Start command: `node server.js`
- Add `MONGO_URI` and `NODE_ENV=production` as environment variables

### Frontend → Netlify
- Update `frontend/src/environments/environment.prod.ts` with your Render URL
- Run `npm run build` inside `frontend/`
- Drag `dist/frontend/browser/` folder to [netlify.com](https://netlify.com)

## Author

Sujit Patel
