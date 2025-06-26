/**
 * Monitoring and Observability Middleware for F1 Sequential Agents
 */

export class MonitoringMiddleware {
  constructor() {
    this.requestCount = 0;
    this.errorCount = 0;
    this.responseTimeSum = 0;
    this.startTime = Date.now();
  }

  /**
   * Express middleware for request monitoring
   */
  requestMonitoring() {
    const self = this;
    return (req, res, next) => {
      const startTime = Date.now();
      self.requestCount++;

      // Log request
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${req.ip}`);

      // Override res.json to capture response time
      const originalJson = res.json;
      res.json = function(body) {
        const duration = Date.now() - startTime;
        
        // Update metrics
        self.responseTimeSum += duration;
        
        // Log response
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
        
        return originalJson.call(this, body);
      };

      // Handle errors
      res.on('finish', () => {
        if (res.statusCode >= 400) {
          self.errorCount++;
        }
      });

      next();
    };
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    const uptime = Date.now() - this.startTime;
    const avgResponseTime = this.requestCount > 0 ? this.responseTimeSum / this.requestCount : 0;

    return {
      uptime: Math.floor(uptime / 1000), // seconds
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      errorRate: this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0,
      avgResponseTime: Math.round(avgResponseTime),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Enhanced health check with metrics
   */
  healthCheck() {
    const self = this;
    return (req, res) => {
      const metrics = self.getMetrics();
      const isHealthy = metrics.errorRate < 50; // Consider healthy if error rate < 50%

      res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: metrics.uptime,
        metrics: {
          requests: {
            total: metrics.requestCount,
            errors: metrics.errorCount,
            errorRate: `${metrics.errorRate.toFixed(2)}%`,
            avgResponseTime: `${metrics.avgResponseTime}ms`
          },
          system: {
            memory: {
              used: `${Math.round(metrics.memory.heapUsed / 1024 / 1024)}MB`,
              total: `${Math.round(metrics.memory.heapTotal / 1024 / 1024)}MB`,
              external: `${Math.round(metrics.memory.external / 1024 / 1024)}MB`
            },
            cpu: {
              user: metrics.cpu.user,
              system: metrics.cpu.system
            }
          }
        },
        agents: {
          available: ['raceResults', 'circuit', 'driver', 'constructor', 'championship', 'historical'],
          status: 'operational'
        }
      });
    };
  }

  /**
   * Detailed metrics endpoint
   */
  metricsEndpoint() {
    const self = this;
    return (req, res) => {
      const metrics = self.getMetrics();
      
      // Prometheus-style metrics format
      const prometheusMetrics = `
# HELP f1_requests_total Total number of HTTP requests
# TYPE f1_requests_total counter
f1_requests_total ${metrics.requestCount}

# HELP f1_errors_total Total number of HTTP errors
# TYPE f1_errors_total counter
f1_errors_total ${metrics.errorCount}

# HELP f1_request_duration_avg Average request duration in milliseconds
# TYPE f1_request_duration_avg gauge
f1_request_duration_avg ${metrics.avgResponseTime}

# HELP f1_uptime_seconds Service uptime in seconds
# TYPE f1_uptime_seconds gauge
f1_uptime_seconds ${metrics.uptime}

# HELP f1_memory_heap_used_bytes Memory heap used in bytes
# TYPE f1_memory_heap_used_bytes gauge
f1_memory_heap_used_bytes ${metrics.memory.heapUsed}

# HELP f1_memory_heap_total_bytes Memory heap total in bytes
# TYPE f1_memory_heap_total_bytes gauge
f1_memory_heap_total_bytes ${metrics.memory.heapTotal}
`.trim();

      res.set('Content-Type', 'text/plain');
      res.send(prometheusMetrics);
    };
  }

  /**
   * Error tracking middleware
   */
  errorTracking() {
    const self = this;
    return (error, req, res, _next) => {
      self.errorCount++;
      
      // Log error details
      console.error(`[${new Date().toISOString()}] ERROR ${req.method} ${req.path}:`, {
        message: error.message,
        stack: error.stack,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });

      // Don't expose internal errors in production
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      res.status(error.status || 500).json({
        error: 'Internal server error',
        message: isDevelopment ? error.message : 'Something went wrong',
        timestamp: new Date().toISOString(),
        ...(isDevelopment && { stack: error.stack })
      });
    };
  }
}

export default MonitoringMiddleware;