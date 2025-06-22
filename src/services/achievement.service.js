const EventEmitter = require('events');

const {Stats, achievementEmitter, levelThresholds} = require('../models/stats.model');
console.log('Achievement emitter imported:', achievementEmitter);
const Achievement = require('../models/achievement.model');

achievementEmitter.on('focus:session:completed', async ({ userId, sessionCount }) => {
    const milestones = [1, 10, 50, 100, 500];
    console.log('I also got to the emitter!!');
    for (const milestone of milestones) {
        if (sessionCount >= milestone) {
            await checkAndAwardAchievement(userId, 'Focus', milestone, 'sessions');
        }
    }
});

achievementEmitter.on('focus:time:added', async ({ userId, timeAdded }) => {
    const timeMilestones = [600,3000, 6000,12000, 60000];
    console.log('Im in the fkn focus time bb');
    for (const milestone of timeMilestones) {
        if (timeAdded >= milestone) {
            console.log('checking for milestone:' ,{milestone})
            await checkAndAwardAchievement(userId, 'Focus', milestone, 'time');
        }
    }
});
achievementEmitter.on('habit:streak:updated', async ({ userId, habits }) => {
    const streakMilestones = [7 , 30];
    const stats = await Stats.findOne({userId});
    console.log('I also got to the emitter habits!!');
    for (const milestone of streakMilestones) {
        for(const habit of habits)
        {
        if (habit.streak >= milestone) {
            await checkAndAwardAchievement(userId, 'Streak', milestone, 'streak');
        }
    }
    }
});
achievementEmitter.on('habit:perfect:week', async ({userId, habitstreak}) =>{
    console.log('before if');
if(habitstreak>=7)
{
    console.log('after if');
    await checkAndAwardAchievement(  userId, 'Streak', 'Perfect Week', 'perfect_week');
}
});
achievementEmitter.on('task:completed', async ({ userId, completedCount }) => {
    const taskMilestones = [10, 50, 100, 200, 500];
    console.log('I also got to the emitter tasks!!');
    for (const milestone of taskMilestones) {
        if (completedCount >= milestone) {
            await checkAndAwardAchievement(userId, 'Task', milestone, 'tasks');
        }
    }
});
achievementEmitter.on('level:up', async ({ userId, newLevel }) => {
    const levelMilestones = [5, 10, 15, 20];
    for (const milestone of levelMilestones) {
        if (newLevel >= milestone) {
            await checkAndAwardAchievement(userId, 'Level', milestone, 'level');
        }
    }
});
achievementEmitter.on('focus:session:special', async ({ userId, hour }) => {
   
  
        await checkAndAwardAchievement(userId, 'Special', 'Night Owl', 'night_owl');
   
});

achievementEmitter.on('special:deep:work', async ({userId, duration}) =>{
    if (duration >= 180) {
        await checkAndAwardAchievement(userId, 'Special', 'Deep Work', 'deep_work');
    }
});
achievementEmitter.on('focus:time:weekend', async ({userId, isWeekend}) =>{
    if (isWeekend) {
        await checkAndAwardAchievement(userId, 'Special', 'Weekend Warrior', 'weekend_warrior');
    }
});
async function checkAndAwardAchievement(userId, category, criteria, type) {
    try {
        const achievements = await Achievement.find({
            category,
            'criteria.value': criteria,
            'criteria.type' : type
        });

        if (!achievements) {
            console.log('No achievement found for:', { category, criteria, type: 'time' });
            return;
        }

        const stats = await Stats.findOne({ userId });
        if (!stats) return;
        for (const achievement of achievements) {
        // Check if user already has this achievement
        const hasAchievement = stats.achievements.some(
            a => a.achievementId.toString() === achievement._id.toString()
        );
        console.log('Checking achievement:', {
            achievementId: achievement._id,
            existingAchievements: stats.achievements.map(a => a.achievementId.toString()),
            hasAchievement
        });
        if (!hasAchievement) {
            // Add achievement to user's stats
            stats.achievements.push({
                achievementId: achievement._id,
                dateUnlocked: new Date()
            });

            // Add XP reward
            const level = stats.level;
            const xp = stats.xp;
            const xpreq = levelThresholds[level-1];
            if(xp+achievement.xp>=xpreq)
            {
                stats.level++;
                const newxp = (xp+achievement.xp)-xpreq;
                stats.xp = newxp;
            }
            else
            {
                stats.xp+=achievement.xp;
            }
            await stats.save();
            // Directly require and call the function from server.js to avoid circular dependencies
            require('../server.js').emitAchievementUnlocked(userId, achievement);
            
        }
        else {
            console.log('I do have the achievement lol');
        }
    }
    } catch (error) {
        console.error('Error awarding achievement:', error);
    }
}

module.exports = {
    achievementEmitter,
    checkAndAwardAchievement
};