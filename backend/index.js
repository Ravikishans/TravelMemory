const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { collectDefaultMetrics, register, Histogram, Counter } = require('prom-client'); // Prometheus client
const app = express();
const PORT = process.env.PORT;
const conn = require('./conn');
const winston = require('winston');


// Prometheus Metrics
collectDefaultMetrics(); // Collect default metrics

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// If we're in development, log to the console as well
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Example usage
logger.info('Logger initialized successfully');
// Example usage
app.use((req, res, next) => {
  logger.info(`Received request for ${req.url}`);
  next();
});

const tracer = require('./tracing');

app.use((req, res, next) => {
  const span = tracer.startSpan('http_request');
  span.setAttribute('method', req.method);
  span.setAttribute('url', req.url);
  span.setAttribute('status_code', res.statusCode);

  res.on('finish', () => {
    span.end();
  });

  next();
});


// Create custom Prometheus metrics
const httpRequestDurationSeconds = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
});

const requestCounter = new Counter({
  name: 'http_request_count',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

// Middleware to track request metrics
app.use((req, res, next) => {
  const end = httpRequestDurationSeconds.startTimer(); // Start timer for request duration
  res.on('finish', () => {
    end({ method: req.method, route: req.path, status: res.statusCode }); // Stop timer when request is finished
    requestCounter.inc({ method: req.method, route: req.path, status: res.statusCode }); // Increment request counter
  });
  next();
});

app.use(express.json());
app.use(cors());

// Routes
const tripRoutes = require('./routes/trip.routes');
app.use('/trip', tripRoutes); // http://localhost:3001/trip --> POST/GET/GET by ID

app.get('/hello', (req, res) => {
  res.send('Hello World!');
});

// Expose Prometheus metrics at /metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (ex) {
    res.status(500).end(ex);
  }
  console.log(await register.metrics());

});

// Start server
app.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`);
});

