import { Achievement } from '@/entities/Achievement';
import { User } from '@/entities/User';
import { toast } from 'sonner';

const achievementDefinitions = {
    first_task: {
        title: 'Langkah Pertama',
        description: 'Selesaikan tugas pertama Anda',
        icon: '🎯',
        points: 10
    },
    task_streak_7: {
        title: 'Konsisten 7 Hari',
        description: 'Selesaikan tugas 7 hari berturut-turut',
        icon: '🔥',
        points: 50
    },
    task_streak_30: {
        title: 'Bulan Produktif',
        description: 'Selesaikan tugas 30 hari berturut-turut',
        icon: '⭐',
        points: 200
    },
    task_master: {
        title: 'Master Tugas',
        description: 'Selesaikan 100 tugas',
        icon: '🏆',
        points: 100
    },
    note_taker: {
        title: 'Pencatat Ulung',
        description: 'Buat 50 catatan',
        icon: '📝',
        points: 75
    },
    financial_tracker: {
        title: 'Ahli Keuangan',
        description: 'Catat 100 transaksi keuangan',
        icon: '💰',
        points: 75
    },
    early_bird: {
        title: 'Burung Pagi',
        description: 'Selesaikan tugas sebelum jam 9 pagi',
        icon: '🌅',
        points: 25
    },
    night_owl: {
        title: 'Burung Malam',
        description: 'Selesaikan tugas setelah jam 10 malam',
        icon: '🌙',
        points: 25
    },
    team_player: {
        title: 'Pemain Tim',
        description: 'Tambahkan 10 komentar di workspace',
        icon: '🤝',
        points: 50
    },
    productivity_champion: {
        title: 'Juara Produktivitas',
        description: 'Capai skor produktivitas 1000',
        icon: '👑',
        points: 500
    }
};

export async function checkAndAwardAchievement(userId, achievementType, customData = {}) {
    try {
        const existing = await Achievement.filter({ 
            user_id: userId, 
            achievement_type: achievementType 
        });
        
        if (existing && existing.length > 0) {
            return null;
        }

        const definition = achievementDefinitions[achievementType];
        if (!definition) return null;

        const achievement = await Achievement.create({
            user_id: userId,
            achievement_type: achievementType,
            title: definition.title,
            description: definition.description,
            icon: definition.icon,
            points: definition.points,
            earned_at: new Date().toISOString()
        });

        const user = await User.get(userId);
        await User.update(userId, {
            achievement_points: (user.achievement_points || 0) + definition.points
        });

        toast.success(`🎉 Pencapaian Baru: ${definition.title}!`, {
            description: `Anda mendapat ${definition.points} poin`
        });

        return achievement;
    } catch (error) {
        console.error('Error awarding achievement:', error);
        return null;
    }
}

export async function updateStreak(userId) {
    try {
        const user = await User.get(userId);
        const today = new Date().toISOString().split('T')[0];
        const lastActive = user.last_active_date;

        if (lastActive === today) {
            return;
        }

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        let newStreak = 1;
        if (lastActive === yesterdayStr) {
            newStreak = (user.current_streak || 0) + 1;
        }

        const longestStreak = Math.max(user.longest_streak || 0, newStreak);

        await User.update(userId, {
            current_streak: newStreak,
            longest_streak: longestStreak,
            last_active_date: today
        });

        if (newStreak === 7) {
            await checkAndAwardAchievement(userId, 'task_streak_7');
        } else if (newStreak === 30) {
            await checkAndAwardAchievement(userId, 'task_streak_30');
        }

    } catch (error) {
        console.error('Error updating streak:', error);
    }
}