// In your scheduler file
const cron = require('node-cron');
const Stats = require('../models/stats.model');


cron.schedule('0 0 * * *', async () => {
  try {
    const today = new Date();
    
  
    const allStats = await Stats.find({});
    
    for (const stats of allStats) {
      let modified = false;
      
    
      for (const habit of stats.habits) {
       
        if (!habit.startDate) continue;
        
        const startDate = new Date(habit.startDate);
        const daysSinceStart = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
        

        if (habit.frequency === 'Daily') {
            if(!habit.completed)
                {
                    stats.habitStreak = 0;
                    habit.streak = 0;
                }
            habit.completed = false;
            habit.progress = 0;
            habit.resetDate = today;
            modified = true;
          
        } 
        else if (habit.frequency === 'Weekly') {
        
          if (daysSinceStart % 7 === 0) {
            if(!habit.completed)
            {
                stats.habitStreak = 0;
                habit.streak = 0;
            }
            habit.completed = false;
            habit.progress = 0;
            habit.resetDate = today;
            modified = true;
          }
        } 
        else if (habit.frequency === 'Monthly') {
         
          if (today.getDate() === startDate.getDate()) {
            if(!habit.completed)
            {
                stats.habitStreak = 0;
                habit.streak = 0;
            }
            habit.completed = false;
            habit.progress = 0;
            habit.resetDate = today;
            modified = true;
          }
        }
      }
      
     
      if (modified) {
        await stats.save();
      }
    }
    
    console.log('Habits reset based on individual creation dates');
  } catch (err) {
    console.error('Error resetting habits:', err);
  }
});