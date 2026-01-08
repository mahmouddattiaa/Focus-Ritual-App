# ✅ Memory Optimization Checklist

## 📋 **Implementation Checklist**

### **Phase 1: Apply Optimizations** ⏱️ 10 minutes

- [ ] **1.1** Read `QUICK_REFERENCE.md` (2 min)
- [ ] **1.2** Read `IMPLEMENTATION_SUMMARY.md` (5 min)
- [ ] **1.3** Run `apply-memory-optimizations.bat`
- [ ] **1.4** Verify backups were created in `backups/` folder
- [ ] **1.5** Check for any errors in console

---

### **Phase 2: Testing** ⏱️ 15 minutes

- [ ] **2.1** Start server: `npm run dev`
- [ ] **2.2** Test login/authentication
- [ ] **2.3** Test Socket.IO connection (messaging)
- [ ] **2.4** Test collaboration rooms (join/leave)
- [ ] **2.5** Test PDF upload (< 10MB file)
- [ ] **2.6** Test flashcard generation from PDF
- [ ] **2.7** Test creating notes
- [ ] **2.8** Test subject/lecture creation
- [ ] **2.9** Check console for memory logs (every 5 min)
- [ ] **2.10** Verify no errors in console

**If anything fails:**

- [ ] Restore backups (see IMPLEMENTATION_SUMMARY.md)
- [ ] Report issue with error message

---

### **Phase 3: Monitoring** ⏱️ 1 hour

- [ ] **3.1** Keep server running for 1 hour
- [ ] **3.2** Check memory logs every 10 minutes
- [ ] **3.3** Memory should stay between 80-150MB
- [ ] **3.4** No steady increase over time
- [ ] **3.5** Test Socket.IO multiple times (connect/disconnect)
- [ ] **3.6** Upload 2-3 PDFs
- [ ] **3.7** Memory should not spike above 200MB

**Expected behavior:**

```
[DEBUG] Memory Usage: RSS=120MB, Heap=85MB    ✅ Good
[DEBUG] Memory Usage: RSS=125MB, Heap=88MB    ✅ Good
[DEBUG] Memory Usage: RSS=130MB, Heap=90MB    ✅ Good
```

**Warning signs:**

```
[DEBUG] Memory Usage: RSS=300MB, Heap=250MB   ⚠️ Too high
[DEBUG] Memory Usage: RSS=500MB, Heap=400MB   🔴 Critical
```

---

### **Phase 4: Add Memory Endpoint** ⏱️ 5 minutes (Optional)

- [ ] **4.1** Open `backend/src/server.js`
- [ ] **4.2** Add at the top:
  ```javascript
  const memoryMonitor = require("./utils/memoryMonitor");
  ```
- [ ] **4.3** After `const io = new Server(server, {...})`:
  ```javascript
  memoryMonitor.start();
  ```
- [ ] **4.4** Add route:
  ```javascript
  app.get("/api/memory", memoryMonitor.expressMiddleware());
  ```
- [ ] **4.5** Restart server
- [ ] **4.6** Test endpoint: `http://localhost:5001/api/memory`
- [ ] **4.7** Should see JSON with memory stats

---

### **Phase 5: Controller Optimization** ⏱️ 2-3 hours (This week)

#### **auth.controller.js**

- [ ] **5.1** Open file
- [ ] **5.2** Find all `User.findById()` calls
- [ ] **5.3** Add `.lean()` to READ-ONLY queries
- [ ] **5.4** Test login/register/profile still works
- [ ] **5.5** Commit changes

#### **friends.controller.js**

- [ ] **5.6** Add `.lean()` to friend list queries
- [ ] **5.7** Add `.lean()` to friend requests
- [ ] **5.8** Test friend features
- [ ] **5.9** Commit changes

#### **library.controller.js**

- [ ] **5.10** Add `.lean()` to file list queries
- [ ] **5.11** Add `.lean()` to file search
- [ ] **5.12** Test library features
- [ ] **5.13** Commit changes

#### **stats.controller.js**

- [ ] **5.14** Add `.lean()` to stats queries
- [ ] **5.15** Add `.lean()` to achievement queries
- [ ] **5.16** Test stats dashboard
- [ ] **5.17** Commit changes

#### **Remaining Controllers** (8 more)

- [ ] **5.18** feed.controller.js - Add `.lean()`
- [ ] **5.19** flashcard.controller.js - Add `.lean()`
- [ ] **5.20** subject.controller.js - Add `.lean()`
- [ ] **5.21** learning-path.controller.js - Add `.lean()`
- [ ] **5.22** lecture.controller.js - Add `.lean()`
- [ ] **5.23** note.controller.js - Add `.lean()`
- [ ] **5.24** qa.controller.js - Add `.lean()`
- [ ] **5.25** gemini.controller.js - Add `.lean()`
- [ ] **5.26** Test all features
- [ ] **5.27** Commit all changes

**Rule:** Only add `.lean()` to queries that DON'T call `.save()` after!

---

### **Phase 6: Database Optimization** ⏱️ 1 hour (Next week)

#### **Add Indexes**

- [ ] **6.1** Open `models/user.model.js`
- [ ] **6.2** Add: `UserSchema.index({ email: 1 });`
- [ ] **6.3** Add: `UserSchema.index({ friends: 1 });`
- [ ] **6.4** Open `models/messages.model.js`
- [ ] **6.5** Add: `MessageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });`
- [ ] **6.6** Open `models/post.model.js`
- [ ] **6.7** Add: `PostSchema.index({ author: 1, createdAt: -1 });`
- [ ] **6.8** Restart server (indexes auto-created)

#### **Add Connection Pooling**

- [ ] **6.9** Open `server.js`
- [ ] **6.10** Find `mongoose.connect()`
- [ ] **6.11** Add options:
  ```javascript
  mongoose.connect(mongoURI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
  ```
- [ ] **6.12** Restart server
- [ ] **6.13** Test database queries

---

### **Phase 7: Production Deployment** ⏱️ 30 minutes

- [ ] **7.1** Install PM2: `npm install -g pm2`
- [ ] **7.2** Start with PM2: `pm2 start src/server.js --name focus-ritual`
- [ ] **7.3** Enable auto-restart on high memory:
  ```bash
  pm2 start src/server.js --name focus-ritual --max-memory-restart 500M
  ```
- [ ] **7.4** Enable startup script: `pm2 startup`
- [ ] **7.5** Save PM2 config: `pm2 save`
- [ ] **7.6** Monitor: `pm2 monit`
- [ ] **7.7** Check logs: `pm2 logs`
- [ ] **7.8** Let run for 24 hours
- [ ] **7.9** Check memory stayed stable

---

### **Phase 8: Load Testing** ⏱️ 1 hour (Optional)

- [ ] **8.1** Install Artillery: `npm install -g artillery`
- [ ] **8.2** Create test config (see MEMORY_OPTIMIZATION_GUIDE.md)
- [ ] **8.3** Run load test: `artillery run test.yml`
- [ ] **8.4** Monitor memory during test
- [ ] **8.5** Check for errors
- [ ] **8.6** Verify memory returns to baseline after test

---

## ⚠️ **CRITICAL - Security**

- [ ] **9.1** Change MongoDB password
- [ ] **9.2** Change email password
- [ ] **9.3** Generate new JWT secret
- [ ] **9.4** Update `.env` file
- [ ] **9.5** Verify `.env` in `.gitignore`
- [ ] **9.6** Run `git status` (should NOT show .env)
- [ ] **9.7** Never commit `.env` to git

See **START_HERE.md** for detailed instructions!

---

## 📊 **Success Metrics**

After completing all phases, verify:

### **Memory**

- [ ] Baseline: 80-150MB ✅
- [ ] After 1h: < 200MB ✅
- [ ] After 24h: < 200MB ✅
- [ ] No steady increase ✅
- [ ] No crashes ✅

### **Performance**

- [ ] Login: < 500ms ✅
- [ ] PDF upload: < 5s (10MB) ✅
- [ ] Query response: < 100ms ✅
- [ ] Socket.IO latency: < 50ms ✅

### **Stability**

- [ ] No memory leaks ✅
- [ ] No "out of memory" errors ✅
- [ ] No "MaxListenersExceeded" warnings ✅
- [ ] Uptime: 7+ days ✅

---

## 🎯 **Priority Order**

### **Must Do Today** (High Priority)

1. ✅ Phase 1: Apply optimizations (10 min)
2. ✅ Phase 2: Test everything (15 min)
3. ✅ Phase 3: Monitor 1 hour (1 hour)
4. ⚠️ Phase 9: Security fixes (5 min)

### **Do This Week** (Medium Priority)

5. ✅ Phase 5: Controller optimization (2-3 hours)
6. ✅ Phase 4: Add memory endpoint (5 min)

### **Do Next Week** (Low Priority)

7. ✅ Phase 6: Database optimization (1 hour)
8. ✅ Phase 7: Production deployment (30 min)
9. ✅ Phase 8: Load testing (1 hour)

---

## 📝 **Notes Section**

### **Issues Encountered:**

```
Date: ___________
Issue: _________________________________
Solution: ______________________________
```

### **Memory Readings:**

```
Time: _____ | Memory: _____ MB | Status: ______
Time: _____ | Memory: _____ MB | Status: ______
Time: _____ | Memory: _____ MB | Status: ______
```

### **Performance Before/After:**

```
Metric          | Before | After | Improvement
─────────────────────────────────────────────
Login time      | ___ms | ___ms | ___x
PDF upload      | ___s  | ___s  | ___x
Memory usage    | ___MB | ___MB | ___x
Uptime          | ___h  | ___h  | ___x
```

---

## 🎉 **Completion**

When all checkboxes are done:

- [ ] **All optimizations applied** ✅
- [ ] **All tests passed** ✅
- [ ] **Memory stable for 24h** ✅
- [ ] **Production deployed** ✅
- [ ] **Security fixed** ✅

**Congratulations! Your app is production-ready!** 🚀

---

**Created:** January 4, 2025  
**Status:** Ready for Use  
**Estimated Total Time:** 8-10 hours spread over 2 weeks
