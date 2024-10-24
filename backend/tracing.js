const { NodeTracerProvider } = require('@opentelemetry/node');
const { BatchSpanProcessor } = require('@opentelemetry/tracing');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
const opentelemetry = require('@opentelemetry/api');

const exporter = new JaegerExporter({
  serviceName: 'mern-backend',
  endpoint: 'http://localhost:14268/api/traces',  // Jaeger collector endpoint
});

const provider = new NodeTracerProvider();
provider.addSpanProcessor(new BatchSpanProcessor(exporter));
provider.register();

// Use OpenTelemetry in your application
module.exports = opentelemetry.trace.getTracer('mern-backend');
