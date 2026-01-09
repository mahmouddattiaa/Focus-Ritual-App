# Task Completion Toggle Fix

## Problem
When trying to mark a task as complete or incomplete, the server returned a 400 error:
```
Failed to update task completion. Server responded with 400: 
{"message":"cannot complete task when there are no tasks to complete"}
```

**Root Cause:** The backend had flawed validation logic that prevented users from toggling task completion status based on incorrect assumptions about total task counts.

## Issues Found

### 1. CompleteTask Endpoint (Mark as Complete)
**File:** `backend/src/controllers/stats.controller.js`

**Problematic Code:**
```javascript
if (stats.tasksCompleted.totalTasks <= stats.tasksCompleted.totalCompleted) {
    return res.status(400).json({
        message: 'cannot complete task when there are no tasks to complete'
    });
}
```

**Problem:** This check incorrectly prevented completing tasks when `totalTasks <= totalCompleted`. This doesn't make sense because:
- A user should be able to complete any incomplete task regardless of totals
- The check should only validate if the specific task exists and is not already completed
- This blocks legitimate completion attempts

### 2. DecTasks Endpoint (Mark as Incomplete)
**File:** `backend/src/controllers/stats.controller.js`

**Problematic Code:**
```javascript
if (stats.tasksCompleted.totalCompleted <= 0) {
    return res.status(400).json({
        message: 'cannot decrement tasks when there are none completed'
    });
}
```

**Problem:** Similar flawed logic that prevents marking completed tasks as incomplete when the total count is 0, which can happen in edge cases.

## Solution

### CompleteTask Fix
**Before:**
```javascript
const stats = await Stats.findOne({ userId });
if (stats.tasksCompleted.totalTasks <= stats.tasksCompleted.totalCompleted) {
    return res.status(400).json({
        message: 'cannot complete task when there are no tasks to complete'
    });
}
const tasks = stats.tasks;
const task = stats.tasks.find(t => t._id.toString() === taskId.toString());
```

**After:**
```javascript
const stats = await Stats.findOne({ userId });

if (!stats) {
    return res.status(404).json({ message: 'User stats not found' });
}

const task = stats.tasks.find(t => t._id.toString() === taskId.toString());
```

**Changes:**
- ❌ Removed flawed `totalTasks <= totalCompleted` check
- ✅ Added proper `stats` existence check
- ✅ Removed unused `tasks` variable
- ✅ Only validates if the specific task exists and is not already completed

### DecTasks Fix
**Before:**
```javascript
const stats = await Stats.findOne({ userId });
const tasks = stats.tasks;
const taskObjectId = new mongoose.Types.ObjectId(taskId);
const today = new Date();
const dateKey = today.toISOString().split('T')[0];
if (stats.tasksCompleted.totalCompleted <= 0) {
    return res.status(400).json({
        message: 'cannot decrement tasks when there are none completed'
    });
}
```

**After:**
```javascript
const stats = await Stats.findOne({ userId });

if (!stats) {
    return res.status(404).json({ message: 'User stats not found' });
}

const taskObjectId = new mongoose.Types.ObjectId(taskId);
const today = new Date();
const dateKey = today.toISOString().split('T')[0];
```

**Changes:**
- ❌ Removed flawed `totalCompleted <= 0` check
- ✅ Added proper `stats` existence check
- ✅ Removed unused `tasks` variable
- ✅ Only validates if the specific task exists and is completed

## How It Works Now

### Completing a Task (`/api/stats/task` - CompleteTask)
1. ✅ Check if user stats exist
2. ✅ Check if task exists
3. ✅ Check if task is already completed
4. ✅ If all checks pass, increment counters and mark task as complete

### Uncompleting a Task (`/api/stats/dec` - DecTasks)
1. ✅ Check if user stats exist
2. ✅ Check if task exists
3. ✅ Check if task is already incomplete
4. ✅ If all checks pass, decrement counters and mark task as incomplete

## Validation Flow

### CompleteTask Validation:
```
User authenticated? → Stats exist? → Task exists? → Already completed?
      ↓                    ↓              ↓                 ↓
     No: 401         No: 404         No: 404          Yes: 400
     Yes: Continue   Yes: Continue   Yes: Continue    No: Mark complete ✅
```

### DecTasks Validation:
```
User authenticated? → Stats exist? → Task exists? → Already incomplete?
      ↓                    ↓              ↓                 ↓
     No: 401         No: 404         No: 404          Yes: 400
     Yes: Continue   Yes: Continue   Yes: Continue    No: Mark incomplete ✅
```

## Benefits
✅ Users can freely toggle task completion status
✅ No more false "cannot complete task" errors
✅ Proper validation of task existence and current state
✅ Better error messages (404 when stats/task not found)
✅ Cleaner code without unnecessary validations
✅ Edge cases handled properly

## Testing Checklist
- [ ] Mark an incomplete task as complete
- [ ] Mark a completed task as incomplete
- [ ] Try to complete an already completed task (should return 400)
- [ ] Try to uncomplete an already incomplete task (should return 400)
- [ ] Try with non-existent task ID (should return 404)
- [ ] Verify task counts update correctly in database
- [ ] Check daily activity stats update properly
