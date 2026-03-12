import { Injectable, NestMiddleware, Module } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Counter, Histogram, register } from 'prom-client';

// HTTP request counter
const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// HTTP request duration histogram
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

@Injectable()
export class HttpMetricsMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();

    // Listen for response finish
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      const method = req.method;
      const statusCode = res.statusCode.toString();

      // Better route extraction after request is processed
      let route = (req as any).route?.path || req.baseUrl || req.path || 'unknown';

      // Clean up UUIDs and numbers to avoid high cardinality in Prometheus
      // e.g. /product/123-abc -> /product/:id
      if (route !== 'unknown') {
        route = route
          .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
          .replace(/\/\d+/g, '/:id');
      }

      // Record metrics
      httpRequestsTotal.inc({ method, route, status_code: statusCode });
      httpRequestDuration.observe({ method, route, status_code: statusCode }, duration);
    });

    next();
  }
}
