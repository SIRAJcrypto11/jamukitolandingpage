import React, { useState, useEffect } from 'react';
import { Achievement } from '@/entities/Achievement';
import { User } from '@/entities/User';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Award, Star, Zap, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { calculateLevel, getPointsForNextLevel, getLevelProgress } from '../helpers/gamificationHelper';
import { Button } from '@/components/ui/button';

export default function AchievementCard({ user, achievements: initialAchievements }) {
  const [achievements, setAchievements] = useState(initialAchievements || []);
  const [isLoading, setIsLoading] = useState(false);
  const [userLevel, setUserLevel] = useState(1);
  const [levelProgress, setLevelProgress] = useState(0);
  const [pointsToNextLevel, setPointsToNextLevel] = useState(100);
  const [refreshedUser, setRefreshedUser] = useState(user);
  const [hasError, setHasError] = useState(false);

  const loadAchievements = async () => {
    if (!user || !user.id) return;

    try {
      setIsLoading(true);
      setHasError(false);
      
      // ✅ Better error handling with catch
      const userAchievements = await Achievement.filter({ user_id: user.id })
        .catch(err => {
          console.log('⚠️ Achievement load error:', err.message);
          return []; // Return empty array on error
        });
        
      setAchievements(userAchievements || []);
    } catch (error) {
      console.log('⚠️ Could not load achievements:', error.message);
      setHasError(true);
      // Keep existing data - don't clear achievements
    } finally {
      setIsLoading(false);
    }
  };

  const calculateUserLevel = async () => {
    if (!user || !user.email) return;

    try {
      const users = await User.filter({ email: user.email })
        .catch(err => {
          console.log('⚠️ User data load error:', err.message);
          return null;
        });
        
      if (!users || users.length === 0) return;

      const freshUser = users[0];
      setRefreshedUser(freshUser);

      const points = freshUser.achievement_points || 0;
      const level = calculateLevel(points);
      const progress = getLevelProgress(points);
      const nextLevelPoints = getPointsForNextLevel(points);

      setUserLevel(level);
      setLevelProgress(progress);
      setPointsToNextLevel(nextLevelPoints);
    } catch (error) {
      console.log('⚠️ Could not calculate level:', error.message);
      // Keep existing data
    }
  };

  const handleRefresh = async () => {
    await Promise.all([loadAchievements(), calculateUserLevel()]);
  };

  useEffect(() => {
    // Load once on mount with delay
    const timer = setTimeout(() => {
      loadAchievements();
      calculateUserLevel();
    }, 2000); // Wait 2 seconds before loading

    // Listen for gamification updates
    const handleGamificationUpdate = () => {
      handleRefresh();
    };

    window.addEventListener('gamificationUpdate', handleGamificationUpdate);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('gamificationUpdate', handleGamificationUpdate);
    };
  }, [user]);

  // ✅ Show card even if no user data yet (avoid flash)
  if (!refreshedUser && !user && !hasError) {
    return (
      <Card className="shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Pencapaian & Level
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ✅ Show card with message if error but no data
  if (hasError && achievements.length === 0 && !refreshedUser) {
    return (
      <Card className="shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Pencapaian & Level
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Data pencapaian sedang dimuat...
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="mt-3"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Muat Ulang
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ✅ Use user prop as fallback if refreshedUser not available
  const displayUser = refreshedUser || user;

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Pencapaian & Level
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Star className="w-3 h-3" />
              {displayUser?.achievement_points || 0} Poin
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isLoading}
              className="h-8 w-8"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Level Progress */}
        <motion.div
          key={`level-${userLevel}-${levelProgress}`}
          className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="font-semibold text-lg">Level {userLevel}</span>
            </div>
            {pointsToNextLevel && (
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {Math.max(0, pointsToNextLevel - (displayUser?.achievement_points || 0))} poin lagi
              </span>
            )}
          </div>
          <Progress value={levelProgress} className="h-2 mb-1" />
          <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
            {levelProgress}% menuju Level {userLevel + 1}
          </p>
        </motion.div>

        {/* Productivity Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <motion.div
            key={`tasks-${displayUser?.total_tasks_completed}`}
            className="bg-slate-950 p-2 rounded-lg dark:bg-gray-800"
            whileHover={{ scale: 1.05 }}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {displayUser?.total_tasks_completed || 0}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Tugas</div>
          </motion.div>
          <motion.div
            key={`streak-${displayUser?.current_streak}`}
            className="bg-slate-800 p-2 rounded-lg dark:bg-gray-800"
            whileHover={{ scale: 1.05 }}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {displayUser?.current_streak || 0}🔥
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Streak</div>
          </motion.div>
          <motion.div
            key={`achievements-${achievements.length}`}
            className="bg-slate-800 p-2 rounded-lg dark:bg-gray-800"
            whileHover={{ scale: 1.05 }}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {achievements.length}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Badges</div>
          </motion.div>
        </div>

        {/* Recent Achievements */}
        {achievements.length > 0 ? (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Pencapaian Terbaru
            </h4>
            <AnimatePresence>
              {achievements.slice(0, 5).map((achievement, index) => (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800"
                >
                  <div className="text-3xl">{achievement.icon}</div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm truncate">{achievement.title}</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{achievement.description}</p>
                  </div>
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    +{achievement.points}
                  </Badge>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-6">
            <Award className="w-12 h-12 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Belum ada pencapaian</p>
            <p className="text-xs text-gray-400 mt-1">
              Selesaikan tugas untuk mendapat pencapaian pertama!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}