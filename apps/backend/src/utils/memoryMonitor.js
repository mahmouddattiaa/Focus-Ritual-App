/**
 * Memory Monitoring Utility
 *
 * Provides comprehensive memory monitoring and leak detection for production.
 *
 * Usage:
 *   const memoryMonitor = require('./utils/memoryMonitor');
 *   memoryMonitor.start();
 */

class MemoryMonitor {
  constructor(options = {}) {
    this.checkInterval = options.checkInterval || 5 * 60 * 1000; // 5 minutes default
    this.alertThreshold = options.alertThreshold || 500 * 1024 * 1024; // 500MB default
    this.enableAlerts = options.enableAlerts !== false;
    this.logToFile = options.logToFile || false;

    this.history = [];
    this.maxHistorySize = 100; // Keep last 100 readings
    this.intervalId = null;
    this.isMonitoring = false;
  }

  /**
   * Start memory monitoring
   */
  start() {
    if (this.isMonitoring) {
      console.log("⚠️  Memory monitor already running");
      return;
    }

    console.log("🔍 Memory monitor started");
    console.log(`   Check interval: ${this.checkInterval / 1000}s`);
    console.log(`   Alert threshold: ${this.formatBytes(this.alertThreshold)}`);

    this.isMonitoring = true;

    // Initial check
    this.check();

    // Periodic checks
    this.intervalId = setInterval(() => {
      this.check();
    }, this.checkInterval);
  }

  /**
   * Stop memory monitoring
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isMonitoring = false;
    console.log("🔍 Memory monitor stopped");
  }

  /**
   * Perform a memory check
   */
  check() {
    const usage = process.memoryUsage();
    const timestamp = new Date().toISOString();

    const reading = {
      timestamp,
      rss: usage.rss,
      heapTotal: usage.heapTotal,
      heapUsed: usage.heapUsed,
      external: usage.external,
      arrayBuffers: usage.arrayBuffers,
      heapUsedPercentage: (usage.heapUsed / usage.heapTotal) * 100,
    };

    // Add to history
    this.history.push(reading);
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }

    // Log current status
    this.logMemory(reading);

    // Check for issues
    this.checkForIssues(reading);

    return reading;
  }

  /**
   * Log memory usage
   */
  logMemory(reading) {
    const rssFormatted = this.formatBytes(reading.rss);
    const heapFormatted = this.formatBytes(reading.heapUsed);
    const heapTotalFormatted = this.formatBytes(reading.heapTotal);
    const heapPercent = reading.heapUsedPercentage.toFixed(1);

    console.log(`\n📊 Memory Status [${reading.timestamp}]`);
    console.log(`   RSS:         ${rssFormatted}`);
    console.log(
      `   Heap:        ${heapFormatted} / ${heapTotalFormatted} (${heapPercent}%)`
    );
    console.log(`   External:    ${this.formatBytes(reading.external)}`);
    console.log(`   Array Bufs:  ${this.formatBytes(reading.arrayBuffers)}`);
  }

  /**
   * Check for memory issues
   */
  checkForIssues(reading) {
    // Check if RSS exceeds threshold
    if (reading.rss > this.alertThreshold) {
      this.alert(
        "HIGH_RSS",
        `RSS memory (${this.formatBytes(
          reading.rss
        )}) exceeds threshold (${this.formatBytes(this.alertThreshold)})`
      );
    }

    // Check if heap is over 90% full
    if (reading.heapUsedPercentage > 90) {
      this.alert(
        "HEAP_FULL",
        `Heap is ${reading.heapUsedPercentage.toFixed(
          1
        )}% full - potential memory pressure`
      );
    }

    // Check for memory leak (steady increase)
    if (this.history.length >= 10) {
      const recentReadings = this.history.slice(-10);
      const isIncreasing = this.detectMemoryLeak(recentReadings);

      if (isIncreasing) {
        this.alert(
          "POSSIBLE_LEAK",
          "Memory has been steadily increasing over the last 10 checks"
        );
      }
    }
  }

  /**
   * Detect potential memory leak
   */
  detectMemoryLeak(readings) {
    // Check if RSS is increasing in 8 out of 10 readings
    let increasingCount = 0;

    for (let i = 1; i < readings.length; i++) {
      if (readings[i].rss > readings[i - 1].rss) {
        increasingCount++;
      }
    }

    return increasingCount >= 8; // 80% threshold
  }

  /**
   * Alert on memory issue
   */
  alert(type, message) {
    if (!this.enableAlerts) return;

    console.error(`\n🚨 MEMORY ALERT: ${type}`);
    console.error(`   ${message}`);
    console.error(`   Consider investigating for memory leaks\n`);

    // In production, you might want to:
    // - Send email alert
    // - Send Slack/Discord notification
    // - Log to monitoring service (DataDog, New Relic, etc.)
    // - Take heap snapshot
    // - Restart server if critical
  }

  /**
   * Get memory statistics
   */
  getStats() {
    if (this.history.length === 0) {
      return null;
    }

    const rssValues = this.history.map((r) => r.rss);
    const heapValues = this.history.map((r) => r.heapUsed);

    return {
      current: this.history[this.history.length - 1],
      average: {
        rss: this.average(rssValues),
        heap: this.average(heapValues),
      },
      min: {
        rss: Math.min(...rssValues),
        heap: Math.min(...heapValues),
      },
      max: {
        rss: Math.max(...rssValues),
        heap: Math.max(...heapValues),
      },
      trend: this.detectMemoryLeak(this.history.slice(-10))
        ? "increasing"
        : "stable",
    };
  }

  /**
   * Format bytes to human-readable
   */
  formatBytes(bytes) {
    if (bytes === 0) return "0 B";

    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  /**
   * Calculate average
   */
  average(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  /**
   * Force garbage collection (if enabled)
   */
  forceGC() {
    if (global.gc) {
      console.log("🧹 Running garbage collection...");
      const before = process.memoryUsage().heapUsed;
      global.gc();
      const after = process.memoryUsage().heapUsed;
      const freed = before - after;
      console.log(`   Freed: ${this.formatBytes(freed)}`);
    } else {
      console.log("⚠️  Garbage collection not available");
      console.log("   Start Node with --expose-gc flag to enable");
    }
  }

  /**
   * Take heap snapshot (requires heapdump module)
   */
  takeHeapSnapshot() {
    try {
      const heapdump = require("heapdump");
      const filename = `heap-${Date.now()}.heapsnapshot`;
      heapdump.writeSnapshot(filename, (err, filepath) => {
        if (err) {
          console.error("Failed to create heap snapshot:", err);
        } else {
          console.log("Heap snapshot saved to:", filepath);
          console.log("Open in Chrome DevTools > Memory > Load");
        }
      });
    } catch (err) {
      console.error("Heapdump module not installed");
      console.log("Install with: npm install heapdump");
    }
  }

  /**
   * Get Express middleware for memory endpoint
   */
  expressMiddleware() {
    return (req, res) => {
      const stats = this.getStats();
      const current = this.check();

      res.json({
        current: {
          rss: this.formatBytes(current.rss),
          heap: this.formatBytes(current.heapUsed),
          heapTotal: this.formatBytes(current.heapTotal),
          heapPercent: current.heapUsedPercentage.toFixed(1) + "%",
          external: this.formatBytes(current.external),
          arrayBuffers: this.formatBytes(current.arrayBuffers),
        },
        stats: stats
          ? {
              average: {
                rss: this.formatBytes(stats.average.rss),
                heap: this.formatBytes(stats.average.heap),
              },
              min: {
                rss: this.formatBytes(stats.min.rss),
                heap: this.formatBytes(stats.min.heap),
              },
              max: {
                rss: this.formatBytes(stats.max.rss),
                heap: this.formatBytes(stats.max.heap),
              },
              trend: stats.trend,
              readings: this.history.length,
            }
          : null,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      });
    };
  }
}

// Create singleton instance
const memoryMonitor = new MemoryMonitor({
  checkInterval: process.env.MEMORY_CHECK_INTERVAL || 5 * 60 * 1000,
  alertThreshold: process.env.MEMORY_ALERT_THRESHOLD || 500 * 1024 * 1024,
  enableAlerts: process.env.NODE_ENV === "production",
});

module.exports = memoryMonitor;
