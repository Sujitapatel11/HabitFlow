const Habit = require('../models/Habit');
const Post = require('../models/Post');

// ─── Helpers ────────────────────────────────────────────────────────────────

function getWeekRange(weeksAgo = 0) {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const startOfThisWeek = new Date(now);
  startOfThisWeek.setDate(now.getDate() - dayOfWeek);
  startOfThisWeek.setHours(0, 0, 0, 0);

  const start = new Date(startOfThisWeek);
  start.setDate(start.getDate() - weeksAgo * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

function calcDisciplineScore(completionRate, streakConsistency, communityParticipation) {
  return Math.round(
    streakConsistency * 0.4 +
    completionRate * 0.4 +
    communityParticipation * 0.2
  );
}

function getPersonalityType(score, completionRate, maxStreak, nightOwl) {
  if (score >= 85) return { type: 'Consistent Builder', icon: '🏗️', desc: 'You show up every day, no excuses.' };
  if (score >= 70 && nightOwl) return { type: 'Night Coder', icon: '🌙', desc: 'You do your best work after dark.' };
  if (score >= 70) return { type: 'Focused Builder', icon: '⚡', desc: 'Strong focus, building real momentum.' };
  if (maxStreak >= 7) return { type: 'Streak Hunter', icon: '🔥', desc: 'You chase streaks like trophies.' };
  if (completionRate >= 60 && completionRate < 75) return { type: 'Weekend Warrior', icon: '⚔️', desc: 'You burst with energy on weekends.' };
  if (score >= 50) return { type: 'Comeback Fighter', icon: '🥊', desc: 'You fall, but you always get back up.' };
  return { type: 'Rising Challenger', icon: '🌱', desc: 'Every expert was once a beginner.' };
}

function getRankLabel(score) {
  if (score >= 90) return 'Elite';
  if (score >= 80) return 'Focused Builder';
  if (score >= 70) return 'Consistent';
  if (score >= 55) return 'Developing';
  if (score >= 40) return 'Inconsistent';
  return 'Just Starting';
}

// ─── Main Controller ─────────────────────────────────────────────────────────

const getReflection = async (req, res, next) => {
  try {
    const { userId, userName } = req.query;
    if (!userId) return res.status(400).json({ success: false, message: 'userId required' });

    const { start: weekStart, end: weekEnd } = getWeekRange(0);
    const { start: prevStart, end: prevEnd } = getWeekRange(1);

    // All habits for this user
    const allHabits = await Habit.find({ userId }).lean();
    const totalHabits = allHabits.length;

    if (totalHabits === 0) {
      return res.json({
        success: true,
        data: {
          empty: true,
          message: 'No habits found. Start tracking to see your reflection.',
        },
      });
    }

    // Completed this week (lastCompletedDate in range)
    const completedThisWeek = allHabits.filter(h => {
      if (!h.lastCompletedDate) return false;
      const d = new Date(h.lastCompletedDate);
      return d >= weekStart && d < weekEnd;
    });

    // Completed last week
    const completedLastWeek = allHabits.filter(h => {
      if (!h.lastCompletedDate) return false;
      const d = new Date(h.lastCompletedDate);
      return d >= prevStart && d < prevEnd;
    });

    const completionRate = totalHabits > 0
      ? Math.round((completedThisWeek.length / totalHabits) * 100)
      : 0;

    const prevCompletionRate = totalHabits > 0
      ? Math.round((completedLastWeek.length / totalHabits) * 100)
      : 0;

    const trend = completionRate > prevCompletionRate
      ? 'Improving 📈'
      : completionRate < prevCompletionRate
        ? 'Declining 📉'
        : 'Steady ➡️';

    // Streaks
    const maxStreak = allHabits.reduce((m, h) => Math.max(m, h.streak || 0), 0);
    const avgStreak = totalHabits > 0
      ? Math.round(allHabits.reduce((s, h) => s + (h.streak || 0), 0) / totalHabits)
      : 0;

    // Strongest / weakest by category
    const catMap = {};
    for (const h of allHabits) {
      const cat = h.category || 'Other';
      if (!catMap[cat]) catMap[cat] = { total: 0, completed: 0, streak: 0 };
      catMap[cat].total++;
      if (h.completed) catMap[cat].completed++;
      catMap[cat].streak = Math.max(catMap[cat].streak, h.streak || 0);
    }

    const catEntries = Object.entries(catMap).map(([name, v]) => ({
      name,
      rate: v.total > 0 ? Math.round((v.completed / v.total) * 100) : 0,
      streak: v.streak,
    }));

    catEntries.sort((a, b) => b.rate - a.rate);
    const strongestCat = catEntries[0] || null;
    const weakestCat = catEntries[catEntries.length - 1] || null;

    // Habit-level strongest/weakest
    const completedHabits = allHabits.filter(h => h.completed);
    const strongestHabit = completedHabits.sort((a, b) => (b.streak || 0) - (a.streak || 0))[0] || null;
    const missedHabits = allHabits.filter(h => !h.completed);
    const weakestHabit = missedHabits[0] || null;

    // Community participation (posts this week)
    const weekPosts = await Post.countDocuments({
      authorName: userName || '',
      createdAt: { $gte: weekStart, $lt: weekEnd },
    });
    const communityParticipation = Math.min(weekPosts * 20, 100); // 5 posts = 100%

    // Streak consistency score (% of habits with streak > 0)
    const habitsWithStreak = allHabits.filter(h => (h.streak || 0) > 0).length;
    const streakConsistency = totalHabits > 0
      ? Math.round((habitsWithStreak / totalHabits) * 100)
      : 0;

    // Night owl detection (heuristic: last completed after 21:00)
    const recentCompletions = allHabits
      .filter(h => h.lastCompletedDate)
      .map(h => new Date(h.lastCompletedDate).getHours());
    const nightCompletions = recentCompletions.filter(h => h >= 21 || h < 4).length;
    const nightOwl = recentCompletions.length > 0 && nightCompletions / recentCompletions.length >= 0.5;

    // Time pattern
    let timePattern = null;
    if (recentCompletions.length > 0) {
      const avgHour = Math.round(recentCompletions.reduce((a, b) => a + b, 0) / recentCompletions.length);
      if (avgHour >= 5 && avgHour < 12) timePattern = { label: 'Morning Person ☀️', hour: avgHour, suggestion: 'Great! Morning habits stick best.' };
      else if (avgHour >= 12 && avgHour < 17) timePattern = { label: 'Afternoon Achiever 🌤️', hour: avgHour, suggestion: 'Solid afternoon routine. Try one habit before lunch.' };
      else if (avgHour >= 17 && avgHour < 21) timePattern = { label: 'Evening Executor 🌆', hour: avgHour, suggestion: 'Evening habits are strong. Watch for late-night skips.' };
      else timePattern = { label: 'Night Owl 🌙', hour: avgHour, suggestion: 'You work late. Try moving one habit to morning for balance.' };
    }

    // Discipline score
    const disciplineScore = calcDisciplineScore(completionRate, streakConsistency, communityParticipation);
    const rank = getRankLabel(disciplineScore);
    const personality = getPersonalityType(disciplineScore, completionRate, maxStreak, nightOwl);

    // Suggestions
    const suggestions = [];
    if (weakestHabit) suggestions.push(`Try moving "${weakestHabit.name}" to your strongest time of day.`);
    if (completionRate < 50) suggestions.push('You completed less than half your habits. Start with just 1 habit per day.');
    if (maxStreak >= 7) suggestions.push(`Your ${maxStreak}-day streak is impressive — protect it!`);
    if (communityParticipation === 0) suggestions.push('Share a post in the community — accountability boosts completion by 30%.');
    if (nightOwl && weakestCat?.name === 'Fitness') suggestions.push('Fitness habits are hard at night. Try a 10-min morning walk instead.');

    // Week number
    const weekNum = Math.ceil((weekStart.getTime() - new Date(weekStart.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));

    res.json({
      success: true,
      data: {
        empty: false,
        weekNum,
        weekStart: weekStart.toISOString(),
        totalHabits,
        completedCount: completedThisWeek.length,
        missedCount: totalHabits - completedThisWeek.length,
        completionRate,
        prevCompletionRate,
        trend,
        maxStreak,
        avgStreak,
        strongestHabit: strongestHabit ? { name: strongestHabit.name, streak: strongestHabit.streak, category: strongestHabit.category } : null,
        weakestHabit: weakestHabit ? { name: weakestHabit.name, category: weakestHabit.category } : null,
        strongestCategory: strongestCat,
        weakestCategory: weakestCat,
        timePattern,
        nightOwl,
        communityParticipation,
        streakConsistency,
        disciplineScore,
        rank,
        personality,
        suggestions,
        categoryBreakdown: catEntries,
      },
    });
  } catch (err) { next(err); }
};

module.exports = { getReflection };
