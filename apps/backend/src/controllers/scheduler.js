// In your scheduler file
const cron = require('node-cron');
const {Stats} = require('../models/stats.model');
console.log('I am here in the scheduler');
console.trace("Scheduler file was required from:");
const scheduledJob = cron.schedule('0 0 * * *', async () => {
  try {
    const today = new Date();
    
  
    const allStats = await Stats.find({});
    
    for (const stats of allStats) {
      let modified = false;
      const tasksToRemove = [];
      for(const task of stats.tasks)
      {
        if(task.completed === true){
          if(task.priority === 'low' ||task.priority ==='medium')
          {
            stats.pts+=10;
          }
          else
          {stats.pts+=20;

          }
           tasksToRemove.push(task._id);
          if(!modified)
          {
          modified = true;
          }
        }
      }
      for(const taskId of tasksToRemove)
      {
        stats.tasks.pull({_id:taskId});
      }
    
      for (const habit of stats.habits) {
       
        if (!habit.startDate) continue;
        
        const startDate = new Date(habit.startDate);
        const daysSinceStart = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
        

        if (habit.frequency === 'Daily') {
            if(!habit.completed)
                {
                  console.log('is it getting reset from here?');
                    stats.habitStreak = 0;
                   
                }
                else
                {
                  stats.pts+=10;
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
               
            }else
            {
              stats.pts+=20;
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
            
            }
            else
            {
              stats.pts+=30;
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
module.exports = scheduledJob;