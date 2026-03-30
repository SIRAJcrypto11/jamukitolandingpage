import { User } from '@/entities/User';
import { Achievement } from '@/entities/Achievement';
import { toast } from 'sonner';

// Level thresholds based on points
const LEVEL_THRESHOLDS = [
    0,      // Level 1: 0 points
    100,    // Level 2: 100 points
    250,    // Level 3: 250 points
    500,    // Level 4: 500 points
    1000,   // Level 5: 1000 points
    2000,   // Level 6: 2000 points
    3500,   // Level 7: 3500 points
    5500,   // Level 8: 5500 points
    8000,   // Level 9: 8000 points
    11000   // Level 10: 11000 points
];

// Calculate level from points
export function calculateLevel(points) {
    let level = 1;
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
        if (points >= LEVEL_THRESHOLDS[i]) {
            level = i + 1;
            break;
        }
    }
    return level;
}

// Get points needed for next level
export function getPointsForNextLevel(currentPoints) {
    const currentLevel = calculateLevel(currentPoints);
    if (currentLevel >= LEVEL_THRESHOLDS.length) {
        return null;
    }
    return LEVEL_THRESHOLDS[currentLevel];
}

// Get progress percentage to next level
export function getLevelProgress(currentPoints) {
    const currentLevel = calculateLevel(currentPoints);
    if (currentLevel >= LEVEL_THRESHOLDS.length) {
        return 100;
    }
    
    const currentLevelThreshold = LEVEL_THRESHOLDS[currentLevel - 1];
    const nextLevelThreshold = LEVEL_THRESHOLDS[currentLevel];
    const pointsIntoLevel = currentPoints - currentLevelThreshold;
    const pointsNeededForLevel = nextLevelThreshold - currentLevelThreshold;
    
    return Math.round((pointsIntoLevel / pointsNeededForLevel) * 100);
}

// Simple confetti animation
export function triggerConfetti() {
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    const confettiCount = 50;
    
    for (let i = 0; i < confettiCount; i++) {
        createConfettiPiece(colors[Math.floor(Math.random() * colors.length)]);
    }
}

function createConfettiPiece(color) {
    const confetti = document.createElement('div');
    confetti.style.position = 'fixed';
    confetti.style.width = '10px';
    confetti.style.height = '10px';
    confetti.style.backgroundColor = color;
    confetti.style.left = Math.random() * window.innerWidth + 'px';
    confetti.style.top = '-10px';
    confetti.style.opacity = '1';
    confetti.style.transform = 'rotate(' + Math.random() * 360 + 'deg)';
    confetti.style.zIndex = '9999';
    confetti.style.pointerEvents = 'none';
    
    document.body.appendChild(confetti);
    
    const fallDuration = Math.random() * 3 + 2;
    const horizontalMovement = (Math.random() - 0.5) * 200;
    
    confetti.animate([
        { 
            transform: `translate(0, 0) rotate(0deg)`,
            opacity: 1 
        },
        { 
            transform: `translate(${horizontalMovement}px, ${window.innerHeight}px) rotate(${Math.random() * 720}deg)`,
            opacity: 0 
        }
    ], {
        duration: fallDuration * 1000,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    });
    
    setTimeout(() => {
        confetti.remove();
    }, fallDuration * 1000);
}

// Trigger UI refresh
function triggerGamificationUpdate() {
    console.log('🔄 Triggering gamification update event');
    window.dispatchEvent(new CustomEvent('gamificationUpdate'));
}

// Award achievement
export async function awardAchievement(userEmail, achievementType, definition) {
    try {
        console.log('🏆 Awarding achievement:', achievementType, 'to', userEmail);
        
        // Get user by email
        const users = await User.filter({ email: userEmail });
        if (!users || users.length === 0) {
            console.error('❌ User not found:', userEmail);
            return null;
        }
        const user = users[0];
        
        // Check if already earned
        const existing = await Achievement.filter({ 
            user_id: user.id, 
            achievement_type: achievementType 
        });
        
        if (existing && existing.length > 0) {
            console.log('ℹ️ Achievement already earned:', achievementType);
            return null;
        }

        // Create achievement
        const achievement = await Achievement.create({
            user_id: user.id,
            achievement_type: achievementType,
            title: definition.title,
            description: definition.description,
            icon: definition.icon,
            points: definition.points,
            earned_at: new Date().toISOString()
        });

        const oldPoints = user.achievement_points || 0;
        const newPoints = oldPoints + definition.points;
        const oldLevel = calculateLevel(oldPoints);
        const newLevel = calculateLevel(newPoints);

        console.log('📊 Updating user points:', oldPoints, '->', newPoints);
        
        // Update user points and level
        await User.update(user.id, {
            achievement_points: newPoints,
            user_level: newLevel
        });

        // Trigger UI refresh
        triggerGamificationUpdate();

        // Show achievement notification
        toast.success(`🎉 Pencapaian Baru: ${definition.title}!`, {
            description: `+${definition.points} poin`,
            duration: 5000
        });

        // Trigger confetti
        triggerConfetti();

        // Check for level up
        if (newLevel > oldLevel) {
            setTimeout(() => {
                toast.success(`🎊 Level Up! Anda sekarang Level ${newLevel}!`, {
                    description: `Terus tingkatkan produktivitas Anda!`,
                    duration: 5000
                });
                triggerConfetti();
            }, 1000);
        }

        return achievement;
    } catch (error) {
        console.error('❌ Error awarding achievement:', error);
        return null;
    }
}

// Main function - Update productivity score on task completion
export async function onTaskCompleted(userEmail, task) {
    try {
        console.log('');
        console.log('═══════════════════════════════════════════');
        console.log('🎮 GAMIFICATION: TASK COMPLETED');
        console.log('═══════════════════════════════════════════');
        console.log('📧 User Email:', userEmail);
        console.log('📝 Task:', task.title);
        console.log('═══════════════════════════════════════════');
        
        if (!userEmail) {
            console.error('❌ No user email provided');
            return;
        }

        // Get current user using email
        const users = await User.filter({ email: userEmail });
        if (!users || users.length === 0) {
            console.error('❌ User not found for email:', userEmail);
            return;
        }
        const user = users[0];
        console.log('✅ User found:', user.full_name, '| ID:', user.id);
        console.log('📊 Current Points:', user.achievement_points || 0);
        console.log('🎚️ Current Level:', user.user_level || 1);
        
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        
        // Calculate points for this task
        let taskPoints = 10; // Base points
        console.log('💰 Base points: 10');
        
        // Bonus for priority
        if (task.priority === 'high') {
            taskPoints += 5;
            console.log('⬆️ High priority bonus: +5 points');
        }
        if (task.priority === 'urgent') {
            taskPoints += 10;
            console.log('🔥 Urgent priority bonus: +10 points');
        }
        
        // Bonus for completing on time
        if (task.due_date) {
            const dueDate = new Date(task.due_date);
            if (now <= dueDate) {
                taskPoints += 5;
                console.log('⏰ On-time completion bonus: +5 points');
            }
        }
        
        // Bonus for time of completion
        const hour = now.getHours();
        if (hour < 9) {
            taskPoints += 5;
            console.log('🌅 Early bird bonus: +5 points');
            await awardAchievement(userEmail, 'early_bird', {
                title: 'Burung Pagi',
                description: 'Selesaikan tugas sebelum jam 9 pagi',
                icon: '🌅',
                points: 25
            });
        } else if (hour >= 22) {
            taskPoints += 5;
            console.log('🌙 Night owl bonus: +5 points');
            await awardAchievement(userEmail, 'night_owl', {
                title: 'Burung Malam',
                description: 'Selesaikan tugas setelah jam 10 malam',
                icon: '🌙',
                points: 25
            });
        }
        
        console.log('💎 Total task points:', taskPoints);
        
        // Update streak
        const lastActive = user.last_active_date;
        let newStreak = 1;
        
        if (lastActive !== today) {
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            
            if (lastActive === yesterdayStr) {
                newStreak = (user.current_streak || 0) + 1;
                console.log('🔥 Streak continued:', newStreak, 'days');
            } else {
                console.log('🔄 Streak reset to 1');
            }
        } else {
            newStreak = user.current_streak || 1;
            console.log('✅ Same day, streak maintained:', newStreak);
        }
        
        const longestStreak = Math.max(user.longest_streak || 0, newStreak);
        
        // Update user stats
        const totalCompleted = (user.total_tasks_completed || 0) + 1;
        const oldPoints = user.achievement_points || 0;
        const newPoints = oldPoints + taskPoints;
        const oldLevel = calculateLevel(oldPoints);
        const newLevel = calculateLevel(newPoints);
        const newProductivityScore = (user.productivity_score || 0) + taskPoints;
        
        console.log('');
        console.log('📈 UPDATING USER STATS:');
        console.log('─────────────────────────────────────────');
        console.log('✓ Total Tasks Completed:', totalCompleted);
        console.log('✓ Points:', oldPoints, '→', newPoints, `(+${taskPoints})`);
        console.log('✓ Level:', oldLevel, '→', newLevel);
        console.log('✓ Productivity Score:', newProductivityScore);
        console.log('✓ Streak:', newStreak, '| Longest:', longestStreak);
        console.log('─────────────────────────────────────────');
        
        await User.update(user.id, {
            total_tasks_completed: totalCompleted,
            achievement_points: newPoints,
            user_level: newLevel,
            productivity_score: newProductivityScore,
            current_streak: newStreak,
            longest_streak: longestStreak,
            last_active_date: today
        });
        
        console.log('✅ User stats updated successfully!');
        
        // Trigger UI refresh
        triggerGamificationUpdate();
        
        // Show points notification
        toast.success(`+${taskPoints} poin! 🎯`, {
            description: `Total: ${newPoints} poin (Level ${newLevel})`,
            duration: 3000
        });
        
        // Check for level up
        if (newLevel > oldLevel) {
            console.log('🎊 LEVEL UP! New level:', newLevel);
            setTimeout(() => {
                toast.success(`🎊 Level Up! Anda sekarang Level ${newLevel}!`, {
                    description: `Terus tingkatkan produktivitas Anda!`,
                    duration: 5000
                });
                triggerConfetti();
            }, 500);
        }
        
        // Check for milestone achievements
        console.log('🏆 Checking milestone achievements...');
        
        if (totalCompleted === 1) {
            console.log('🎯 First task milestone!');
            await awardAchievement(userEmail, 'first_task', {
                title: 'Langkah Pertama',
                description: 'Selesaikan tugas pertama Anda',
                icon: '🎯',
                points: 10
            });
        }
        
        if (totalCompleted === 10) {
            console.log('⭐ 10 tasks milestone!');
            await awardAchievement(userEmail, 'task_10', {
                title: 'Pemula yang Rajin',
                description: 'Selesaikan 10 tugas',
                icon: '⭐',
                points: 50
            });
        }
        
        if (totalCompleted === 50) {
            console.log('🌟 50 tasks milestone!');
            await awardAchievement(userEmail, 'task_50', {
                title: 'Produktif Sejati',
                description: 'Selesaikan 50 tugas',
                icon: '🌟',
                points: 100
            });
        }
        
        if (totalCompleted === 100) {
            console.log('🏆 100 tasks milestone!');
            await awardAchievement(userEmail, 'task_master', {
                title: 'Master Tugas',
                description: 'Selesaikan 100 tugas',
                icon: '🏆',
                points: 200
            });
        }
        
        // Check for streak achievements
        if (newStreak === 3) {
            console.log('🔥 3-day streak achievement!');
            await awardAchievement(userEmail, 'streak_3', {
                title: 'Mulai Konsisten',
                description: 'Streak 3 hari berturut-turut',
                icon: '🔥',
                points: 30
            });
        }
        
        if (newStreak === 7) {
            console.log('🔥 7-day streak achievement!');
            await awardAchievement(userEmail, 'task_streak_7', {
                title: 'Konsisten 7 Hari',
                description: 'Selesaikan tugas 7 hari berturut-turut',
                icon: '🔥',
                points: 50
            });
        }
        
        if (newStreak === 30) {
            console.log('⭐ 30-day streak achievement!');
            await awardAchievement(userEmail, 'task_streak_30', {
                title: 'Bulan Produktif',
                description: 'Selesaikan tugas 30 hari berturut-turut',
                icon: '⭐',
                points: 200
            });
        }
        
        // Check for productivity score milestone
        if (newProductivityScore >= 1000) {
            console.log('👑 Productivity champion!');
            await awardAchievement(userEmail, 'productivity_champion', {
                title: 'Juara Produktivitas',
                description: 'Capai skor produktivitas 1000',
                icon: '👑',
                points: 500
            });
        }
        
        console.log('═══════════════════════════════════════════');
        console.log('✅ GAMIFICATION COMPLETED SUCCESSFULLY');
        console.log('═══════════════════════════════════════════');
        console.log('');
        
    } catch (error) {
        console.error('');
        console.error('═══════════════════════════════════════════');
        console.error('❌ GAMIFICATION ERROR');
        console.error('═══════════════════════════════════════════');
        console.error('Error:', error);
        console.error('Stack:', error.stack);
        console.error('═══════════════════════════════════════════');
        console.error('');
    }
}

// Also export for notes
export async function onNoteCreated(userEmail) {
    try {
        console.log('📝 Note created by:', userEmail);
        
        if (!userEmail) return;
        
        const users = await User.filter({ email: userEmail });
        if (!users || users.length === 0) return;
        const user = users[0];
        
        const totalNotes = (user.total_notes_created || 0) + 1;
        const points = 5;
        const newPoints = (user.achievement_points || 0) + points;
        const newLevel = calculateLevel(newPoints);
        
        await User.update(user.id, {
            total_notes_created: totalNotes,
            achievement_points: newPoints,
            user_level: newLevel
        });
        
        // Trigger UI refresh
        triggerGamificationUpdate();
        
        toast.success(`+${points} poin untuk membuat catatan! 📝`);
        
        // Check achievements
        if (totalNotes === 10) {
            await awardAchievement(userEmail, 'note_10', {
                title: 'Pencatat Pemula',
                description: 'Buat 10 catatan',
                icon: '📝',
                points: 25
            });
        }
        
        if (totalNotes === 50) {
            await awardAchievement(userEmail, 'note_taker', {
                title: 'Pencatat Ulung',
                description: 'Buat 50 catatan',
                icon: '📝',
                points: 75
            });
        }
        
    } catch (error) {
        console.error('Error updating note gamification:', error);
    }
}