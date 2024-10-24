
---

# **TravelMemory MERN Application - Advanced Monitoring Solution**

## **Overview**

This report outlines the steps to set up an advanced monitoring solution for the **TravelMemory MERN application**. It integrates **Prometheus** for metrics, **Grafana** for visualization, **Loki** for log aggregation, **Promtail** for shipping logs, and **Jaeger** for distributed tracing. The goal is to monitor the application’s performance, log the events, and trace request flows through the stack.

## **Architecture Overview**

- **Prometheus**: Collects metrics from the Node.js backend and MongoDB.
- **Grafana**: Visualizes the metrics and logs, and provides dashboards for monitoring the application.
- **Loki**: Aggregates logs from the backend and frontend.
- **Promtail**: Ships logs to Loki.
- **Jaeger**: Provides distributed tracing for monitoring request flows.
- **MERN Application**: A travel memory application built with MongoDB, Express.js, React, and Node.js.

---

## **Step 1: MERN Application Setup**

### **Application Deployment**

1. Clone the TravelMemory application repository:
   ```bash
   git clone https://github.com/UnpredictablePrashant/TravelMemory.git
   cd TravelMemory
   ```

2. Set up environment variables for the application. In the `backend/` directory, create a `.env` file:
   ```bash
   MONGO_URI=mongodb://mongo:27017/travelmemory
   JWT_SECRET=your_secret
   ```

3. Build and run the backend and frontend with Docker:
   ```bash
   docker-compose up -d
   ```

4. The frontend is available at `http://localhost:3000`, and the backend runs on port `http://localhost:3001`.

---



Here’s an updated section of the **backend's `index.js`** file to reflect the changes needed for each monitoring step. Each step introduces modifications to integrate logging, metrics, and tracing in the TravelMemory MERN application backend.

---

## **Backend - `index.js` Modifications for Monitoring**

Below are the changes made to the `index.js` file in the backend to integrate **Winston** for logging, **Prometheus** for metrics, and **Jaeger** for distributed tracing.

### **Step 1: Adding Winston for Logging**

**Winston** is used to log backend activities such as HTTP requests, errors, and general logs.

1. Install **Winston**:
   ```bash
   npm install winston
   ```

2. In the `index.js` file, import and configure **Winston**:

   ```javascript
   const winston = require('winston');

   // Configure Winston logger
   const logger = winston.createLogger({
     level: 'info',
     format: winston.format.combine(
       winston.format.timestamp(),
       winston.format.json()
     ),
     transports: [
       new winston.transports.Console(),
       new winston.transports.File({ filename: 'logs/combined.log' })
     ],
   });

   // Example of logging a message
   logger.info('Backend server is starting...');
   ```

3. Add logs to key parts of your backend:
   ```javascript
   app.get('/api/example', (req, res) => {
     logger.info('GET request received at /api/example');
     res.json({ message: 'Example route' });
   });

   app.use((err, req, res, next) => {
     logger.error(`Error occurred: ${err.message}`);
     res.status(500).send('Internal Server Error');
   });
   ```

### **Step 2: Adding Prometheus Metrics**

Prometheus metrics can be exposed using a middleware to track important performance indicators like request duration and response status.

1. Install **Prometheus** dependencies:
   ```bash
   npm install prom-client
   ```

2. Import and configure **Prometheus** metrics in `index.js`:

   ```javascript
   const client = require('prom-client');

   // Create a registry for Prometheus metrics
   const register = new client.Registry();

   // Default metrics (memory usage, CPU usage, etc.)
   client.collectDefaultMetrics({ register });

   // Custom metrics
   const httpRequestDurationMicroseconds = new client.Histogram({
     name: 'http_request_duration_ms',
     help: 'Duration of HTTP requests in ms',
     labelNames: ['method', 'route', 'status_code'],
     buckets: [50, 100, 200, 300, 400, 500, 1000],
   });

   // Register custom metrics
   register.registerMetric(httpRequestDurationMicroseconds);

   // Metrics middleware
   app.use((req, res, next) => {
     const end = httpRequestDurationMicroseconds.startTimer();
     res.on('finish', () => {
       end({ method: req.method, route: req.route ? req.route.path : 'unknown', status_code: res.statusCode });
     });
     next();
   });

   // Expose the /metrics endpoint for Prometheus to scrape
   app.get('/metrics', async (req, res) => {
     res.set('Content-Type', register.contentType);
     res.end(await register.metrics());
   });
   ```

   - **Prometheus Metrics**:
     - `/metrics` endpoint: Exposes application performance metrics.

### **Step 3: Adding Jaeger for Distributed Tracing**

Jaeger is used to trace requests as they move through your system. You’ll integrate Jaeger into the backend using the `jaeger-client` library.

1. Install **Jaeger Client**:
   ```bash
   npm install jaeger-client
   ```

2. Import and configure **Jaeger Tracer** in `index.js`:

   ```javascript
   const initTracer = require('jaeger-client').initTracer;

   // Jaeger configuration
   const config = {
     serviceName: 'backend-service',
     reporter: {
       logSpans: true,
       agentHost: 'jaeger', // Assuming Jaeger is running in Docker
       agentPort: 6831,
     },
     sampler: {
       type: 'const',
       param: 1,
     },
   };

   const options = {
     tags: {
       'backend-service.version': '1.0.0',
     },
   };

   const tracer = initTracer(config, options);

   // Example route with tracing
   app.get('/api/traced-route', (req, res) => {
     const span = tracer.startSpan('handling-traced-route');
     span.log({ event: 'request_received' });
     // Perform some operations
     res.send('Traced Route');
     span.log({ event: 'response_sent' });
     span.finish();
   });
   ```

3. Add tracing to different routes to trace the flow of HTTP requests and backend operations.

### **Complete `index.js` Example:**

```javascript
const express = require('express');
const winston = require('winston');
const client = require('prom-client');
const initTracer = require('jaeger-client').initTracer;

const app = express();

// Winston Logger Configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// Prometheus Metrics Configuration
const register = new client.Registry();
client.collectDefaultMetrics({ register });
const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [50, 100, 200, 300, 400, 500, 1000],
});
register.registerMetric(httpRequestDurationMicroseconds);

// Jaeger Tracer Configuration
const config = {
  serviceName: 'backend-service',
  reporter: {
    logSpans: true,
    agentHost: 'jaeger',
    agentPort: 6831,
  },
  sampler: {
    type: 'const',
    param: 1,
  },
};
const tracer = initTracer(config, {});

// Middleware for Prometheus metrics
app.use((req, res, next) => {
  const end = httpRequestDurationMicroseconds.startTimer();
  res.on('finish', () => {
    end({ method: req.method, route: req.route ? req.route.path : 'unknown', status_code: res.statusCode });
  });
  next();
});

// Logging route
app.get('/api/example', (req, res) => {
  logger.info('GET request received at /api/example');
  res.json({ message: 'Example route' });
});

// Traced route with Jaeger
app.get('/api/traced-route', (req, res) => {
  const span = tracer.startSpan('handling-traced-route');
  span.log({ event: 'request_received' });
  res.send('Traced Route');
  span.log({ event: 'response_sent' });
  span.finish();
});

// Expose Prometheus metrics
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Global Error Logging
app.use((err, req, res, next) => {
  logger.error(`Error occurred: ${err.message}`);
  res.status(500).send('Internal Server Error');
});

app.listen(3001, () => {
  logger.info('Backend server is running on port 3001');
});
```

---

### **Summary of Changes**:

- **Logging**: 
  - Integrated **Winston** for logging server activities, errors, and HTTP requests. Logs are stored in `logs/combined.log`.
  
- **Metrics**:
  - Added **Prometheus** metrics using `prom-client`. Custom HTTP request duration metrics are collected and exposed at `/metrics`.

- **Tracing**:
  - Added **Jaeger** tracing using `jaeger-client`. Requests passing through certain routes are traced, and spans are created to monitor the lifecycle of requests.

---

## **Troubleshooting**

### 1. **Winston Logs Not Appearing**
   - Check that the directory for logs (`logs/`) exists, or create it.
   - Verify the file path for `combined.log` in the Winston transport configuration.

### 2. **Prometheus Metrics Not Exposed**
   - Ensure that the `/metrics` endpoint is accessible from the backend.
   - Verify that `prom-client` is installed and correctly set up.
   - Use Prometheus to scrape the backend’s `/metrics` endpoint at `http://backend:3001/metrics`.

### 3. **Jaeger Tracing Not Working**
   - Ensure the Jaeger agent is running and accessible on port `6831`.
   - Verify the Jaeger configuration in `index.js` points to the correct host (`jaeger`) and port.
   - Check the Jaeger UI at `http://localhost:16686` to verify traces.

This completes the setup for integrating advanced monitoring (logging, metrics, and tracing) into the backend of the TravelMemory MERN application.


## **Step 2: Install Prometheus**

### **Prometheus Installation**

1. Create a `prometheus.yml` configuration file:
   ```yaml
   global:
     scrape_interval: 15s
   scrape_configs:
     - job_name: 'backend'
       static_configs:
         - targets: ['backend:3001'] # Backend endpoint for metrics
     - job_name: 'mongodb'
       static_configs:
         - targets: ['mongodb-exporter:9216'] # MongoDB metrics
   ```

2. In the `docker-compose.yml` file, add a service for Prometheus:
   ```yaml
   prometheus:
     image: prom/prometheus:latest
     volumes:
       - ./prometheus.yml:/etc/prometheus/prometheus.yml
     ports:
       - "9090:9090"
   ```

3. Run Prometheus along with your application:
   ```bash
   docker-compose up -d prometheus
   ```

4. Access Prometheus at `http://localhost:9090`.

---

## **Step 3: Install Grafana**

### **Grafana Installation**

1. Add Grafana as a service in `docker-compose.yml`:
   ```yaml
   grafana:
     image: grafana/grafana
     ports:
       - "3000:3000"
     depends_on:
       - prometheus
   ```

2. Run Grafana:
   ```bash
   docker-compose up -d grafana
   ```

3. Access Grafana at `http://localhost:3000`. The default login credentials are:
   - Username: `admin`
   - Password: `admin`

4. Add **Prometheus** as a data source in Grafana:
   - Go to **Configuration** > **Data Sources** > **Add data source**.
   - Select **Prometheus** and set the URL to `http://prometheus:9090`.

---

## **Step 4: Set Up Loki for Log Aggregation**

### **Loki Installation**

1. Add a `loki-config.yml` file for Loki:
   ```yaml
   server:
     http_listen_port: 3100
   positions:
     filename: /tmp/positions.yml
   scrape_configs:
     - job_name: backend-logs
       static_configs:
         - targets: ['localhost']
           labels:
             job: backend
             __path__: /app/logs/*.log
   ```

2. In `docker-compose.yml`, add services for Loki and Promtail:
   ```yaml
   loki:
     image: grafana/loki:2.4.1
     ports:
       - "3100:3100"
     volumes:
       - ./loki-config.yml:/etc/loki/local-config.yaml

   promtail:
     image: grafana/promtail:2.4.1
     volumes:
       - ./promtail-config.yml:/etc/promtail/promtail-config.yaml
       - /var/log:/var/log
   ```

3. Create a `promtail-config.yml` file:
   ```yaml
   server:
     http_listen_port: 9080
   positions:
     filename: /tmp/positions.yaml
   scrape_configs:
     - job_name: backend-logs
       static_configs:
         - targets:
             - localhost
           labels:
             job: backend
             __path__: /app/logs/*.log # Modify to the backend log path
   ```

4. Run Loki and Promtail:
   ```bash
   docker-compose up -d loki promtail
   ```

5. Add **Loki** as a data source in Grafana:
   - Go to **Configuration** > **Data Sources** > **Add data source**.
   - Select **Loki** and set the URL to `http://loki:3100`.

---

## **Step 5: Set Up Jaeger for Distributed Tracing**

### **Jaeger Installation**

1. Add a Jaeger service in the `docker-compose.yml` file:
   ```yaml
   jaeger:
     image: jaegertracing/all-in-one:1.22
     ports:
       - "16686:16686"   # Jaeger UI
       - "6831:6831/udp" # Tracing port
   ```

2. Run Jaeger:
   ```bash
   docker-compose up -d jaeger
   ```

3. Access Jaeger at `http://localhost:16686`.

### **Integrating Jaeger with Node.js**

1. Install `jaeger-client` in your backend:
   ```bash
   npm install jaeger-client
   ```

2. Add tracing code in your `index.js` file:
   ```javascript
   const initTracer = require('jaeger-client').initTracer;

   const config = {
     serviceName: 'backend-service',
   };
   const options = {};
   const tracer = initTracer(config, options);
   ```

3. Instrument your routes with traces:
   ```javascript
   app.get('/api/some-route', (req, res) => {
     const span = tracer.startSpan('request-handler');
     // Handle request
     span.finish();
     res.send('Response');
   });
   ```

---

## **Step 6: Setting Up Alerts and Anomaly Detection**

1. In Grafana, go to **Alerting** > **Alert rules**.
2. Create a new alert rule based on your application's performance metrics.
   - Example: Create an alert for high API response times or frequent errors.

---

## **Troubleshooting**

### 1. **Unable to Connect to Loki**

**Issue**: Loki cannot be accessed or logs are not visible.

**Solution**:
- Ensure Loki is running by checking its status:
  ```bash
  docker ps | grep loki
  ```
- Verify that `loki-config.yml` points to the correct log path for your application.

### 2. **Promtail Not Collecting Logs**

**Issue**: Promtail does not send logs to Loki.

**Solution**:
- Ensure that Promtail’s `promtail-config.yml` has the correct log path for your application:
  ```yaml
  __path__: /app/logs/*.log # Modify this to match your log directory
  ```

### 3. **Jaeger Traces Not Appearing**

**Issue**: Jaeger does not display traces.

**Solution**:
- Ensure that your application is correctly instrumented for tracing.
- Check the Jaeger port mapping in `docker-compose.yml` and ensure Jaeger is running.

### 4. **Prometheus Not Collecting Metrics**

**Issue**: Prometheus is not scraping the backend or MongoDB metrics.

**Solution**:
- Verify that the backend exposes a `/metrics` endpoint and that Prometheus is correctly configured in `prometheus.yml` to scrape this endpoint.

### 5. **Grafana Data Sources Not Connecting**

**Issue**: Grafana cannot connect to Prometheus or Loki.

**Solution**:
- Ensure that the URLs provided when adding data sources (e.g., `http://prometheus:9090` for Prometheus and `http://loki:3100` for Loki) are correct and accessible.
---



# MongoDB Monitoring with Grafana and Prometheus

## Overview
This document outlines the steps taken to set up monitoring for MongoDB using Grafana and Prometheus. It includes installation commands, troubleshooting steps, and issues encountered during the process.

## Prerequisites
- Ubuntu 20.04 or similar
- Access to a terminal with sudo privileges
- MongoDB installed and running

## Installation Steps

### 1. Download MongoDB Exporter
To monitor MongoDB, the MongoDB Exporter was downloaded:
```bash
wget https://github.com/percona/mongodb_exporter/releases/download/v0.20.0/mongodb_exporter-0.20.0.linux-amd64.tar.gz
```

### 2. Extract the Exporter
Extract the downloaded MongoDB Exporter:
```bash
tar -xvf mongodb_exporter-0.20.0.linux-amd64.tar.gz
```

### 3. Run MongoDB Exporter
Start the MongoDB Exporter with the appropriate MongoDB URI:
```bash
./mongodb_exporter --mongodb.uri=mongodb://localhost:27017
```

### 4. Check MongoDB Service Status
Verify if MongoDB is running:
```bash
sudo systemctl status mongod
```

### 5. Fix Broken Packages
If there are broken package issues, attempt to fix them:
```bash
sudo apt --fix-broken install
```

## Issues Encountered

### 1. MongoDB Connection Issues
- **Error Message**: `Cannot connect to MongoDB: server selection error: server selection timeout...`
- **Resolution**: Check if MongoDB is running and accessible at the expected URI.

### 2. MongoDB Service Fails to Start
- **Error Message**: `mongod.service: Failed with result 'exit-code'.`
- **Resolution Steps**:
    - Ensure MongoDB is installed correctly.
    - Fix any broken dependencies using the following commands:
    ```bash
    sudo apt --fix-broken install
    sudo dpkg --configure -a
    ```

### 3. Package Conflict
- **Error Message**: `trying to overwrite '/usr/bin/bsondump', which is also in package mongo-tools`
- **Resolution Steps**:
    - Purge conflicting packages:
    ```bash
    sudo dpkg --purge mongo-tools mongodb-database-tools
    ```
    - Clean up and reinstall:
    ```bash
    sudo apt --fix-broken install
    sudo apt autoremove
    sudo apt-get install mongodb-database-tools
    ```
- **Error Message** `Check Systemd for Permissions or Ownership Issues: the error status=217/USER` 

- **Resolution Steps**:
  - Make sure the MongoDB service is configured to run under the correct user. You can verify this by checking the mongod.service file:
  ```bash
  sudo nano /lib/systemd/system/mongod.service
  ```
  - Look for the following lines:
  ```ini
  [Service]
  User=mongodb
  Group=mongodb
  ```
  - Make sure the mongodb user exists and the directories have the correct ownership. You can check this with:
  ```bash
  id mongodb
  ```
  - If the mongodb user does not exist, you can create it:
  ```bash
  sudo useradd -r -s /bin/false mongodb
  ```
  - Then, ensure that the MongoDB directories are owned by the mongodb user:
  ```bash
  sudo chown -R mongodb:mongodb /var/lib/mongodb
  sudo chown -R mongodb:mongodb /var/log/mongodb
  ```

  - After making these changes, reload the systemd service and try restarting MongoDB:
  ```bash
  sudo systemctl daemon-reload
  sudo systemctl restart mongod
  ```

### 4. creating database
  - enabling and starting mongodb
    ```bash
    sudo systemctl start mongod
    sudo systemctl enable mongod
    sudo systemctl status mongod
    ```
  - go inside the mongodb and create the database

    ```bash
    mongosh
    use admin
    db.createUser({user: "test",pwd: "testing",roles: [{ role: "clusterMonitor", db: "admin" },{ role: "read", db: "local" }]})
    exit
    ```
  ### - To check that the MongoDO URI environment variable was set correctly, run the following command:
    ```bash
    env | grep mongodb
    ```
  - You’ll receive the following output:
  ```o/p
  MONGODB_URI=mongodb://mongodb_exporter:password@localhost:27017
  ```

### 5. configure prometheus.yml with mongodb by adding following into it and then re-run the prometheus container

  ```yml
  - job_name: 'mongodb_exporter'
    static_configs:
    - targets: ['localhost:9216']
  ```  
  

## Conclusion
After following the above steps and resolving the encountered issues, the setup for monitoring MongoDB with Grafana and Prometheus should be functional. If further issues arise, consult the logs or reach out for community support. For more support refer to ``` https://www.digitalocean.com/community/tutorials/how-to-monitor-mongodb-with-grafana-and-prometheus-on-ubuntu-20-04#step-2-configuring-the-mongodb-exporter ```


