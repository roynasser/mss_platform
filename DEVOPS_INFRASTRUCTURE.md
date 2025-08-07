# MSS Platform - DevOps & Infrastructure Documentation

## Overview
This document outlines the complete DevOps infrastructure, CI/CD pipelines, monitoring, and deployment strategies for the MSS Platform.

## Table of Contents
1. [Infrastructure Architecture](#infrastructure-architecture)
2. [CI/CD Pipeline](#cicd-pipeline)
3. [Container Orchestration](#container-orchestration)
4. [Monitoring & Observability](#monitoring--observability)
5. [Performance Testing](#performance-testing)
6. [Security](#security)
7. [Deployment Strategies](#deployment-strategies)
8. [Disaster Recovery](#disaster-recovery)

## Infrastructure Architecture

### Technology Stack
- **Container Runtime**: Docker 24.x
- **Orchestration**: Kubernetes 1.28+
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus + Grafana
- **Logging**: Loki + Promtail
- **Tracing**: Jaeger
- **Load Testing**: K6
- **Security Scanning**: Trivy, OWASP ZAP

### Service Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                         Load Balancer                        │
│                        (NGINX / Traefik)                     │
└─────────────┬───────────────────────┬──────────────────────┘
              │                       │
    ┌─────────▼──────────┐  ┌────────▼──────────┐
    │   Frontend (3x)     │  │    API (3x)       │
    │   Next.js Apps      │  │  Express Services │
    └─────────┬──────────┘  └────────┬──────────┘
              │                       │
    ┌─────────▼───────────────────────▼──────────┐
    │           Service Mesh (Istio)              │
    └─────────┬───────────────────────┬──────────┘
              │                       │
    ┌─────────▼──────────┐  ┌────────▼──────────┐
    │    PostgreSQL      │  │      Redis         │
    │    (Primary +      │  │   (Cluster Mode)   │
    │     Replicas)      │  │                    │
    └────────────────────┘  └────────────────────┘
```

## CI/CD Pipeline

### Pipeline Stages
1. **Code Quality** - Linting, TypeScript checks
2. **Unit Tests** - Jest tests with coverage
3. **Integration Tests** - API integration tests
4. **E2E Tests** - Playwright browser tests
5. **Security Scan** - Dependency audit, vulnerability scanning
6. **Build** - Docker image creation
7. **Performance Test** - K6 load testing
8. **Deploy Staging** - Automated staging deployment
9. **Deploy Production** - Manual approval required

### GitHub Actions Workflows

#### Main CI/CD Pipeline (`.github/workflows/ci-cd.yml`)
- Triggered on push to main/develop branches
- Runs all test suites in parallel
- Builds and pushes Docker images
- Deploys to appropriate environment

#### Security Scanning (`.github/workflows/security.yml`)
```yaml
name: Security Scan
on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight
  workflow_dispatch:

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Trivy
        uses: aquasecurity/trivy-action@master
      - name: Run OWASP ZAP
        uses: zaproxy/action-full-scan@v0.7.0
```

## Container Orchestration

### Kubernetes Deployment

#### Development Environment
```bash
# Deploy to local Kubernetes (minikube/kind)
kubectl apply -k infrastructure/kubernetes/dev/

# Port forwarding for local access
kubectl port-forward svc/mss-frontend 3000:3000
kubectl port-forward svc/mss-api 3001:3001
```

#### Production Environment
```bash
# Deploy to production cluster
kubectl apply -k infrastructure/kubernetes/production/

# Rolling update
kubectl set image deployment/mss-frontend frontend=mss-platform/frontend:v2.0.0
kubectl rollout status deployment/mss-frontend
```

### Horizontal Pod Autoscaling
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: mss-frontend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: mss-frontend
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## Monitoring & Observability

### Metrics Collection (Prometheus)
- **Application Metrics**: Response times, error rates, throughput
- **Infrastructure Metrics**: CPU, memory, disk, network
- **Business Metrics**: User sessions, interventions, reports generated

### Logging (Loki)
- Centralized log aggregation
- Log retention: 30 days
- Log levels: ERROR, WARN, INFO, DEBUG

### Distributed Tracing (Jaeger)
- End-to-end request tracing
- Performance bottleneck identification
- Service dependency mapping

### Dashboards (Grafana)
1. **System Overview** - Overall platform health
2. **Application Performance** - API latencies, error rates
3. **Infrastructure** - Resource utilization
4. **Security** - Failed auth attempts, suspicious activities
5. **Business Metrics** - User activity, feature usage

### Alerting Rules
- **Critical**: Service down, database unreachable, disk full
- **Warning**: High CPU/memory, slow responses, certificate expiry
- **Info**: Deployment completed, backup successful

## Performance Testing

### Load Testing with K6
```javascript
// Standard load test
k6 run tests/performance/load-test.js

// Stress test
k6 run --vus 500 --duration 30m tests/performance/stress-test.js

// Spike test
k6 run tests/performance/spike-test.js
```

### Performance Benchmarks
- **Homepage Load**: < 2s (P95)
- **API Response**: < 200ms (P95)
- **Dashboard Load**: < 3s (P95)
- **Concurrent Users**: 500+ supported
- **Throughput**: 1000+ req/sec

## Security

### Security Measures
1. **Container Security**
   - Non-root users in containers
   - Read-only root filesystems
   - Security scanning in CI/CD

2. **Network Security**
   - Network policies in Kubernetes
   - TLS everywhere
   - WAF protection

3. **Secrets Management**
   - Kubernetes secrets
   - External secrets operator
   - Rotation policies

4. **Compliance**
   - SOC2 Type II ready
   - ISO 27001 compliant
   - GDPR compliant

### Security Scanning
```bash
# Scan Docker images
trivy image mss-platform/frontend:latest

# Scan Kubernetes manifests
kubesec scan infrastructure/kubernetes/production/

# Dependency audit
npm audit --production
```

## Deployment Strategies

### Blue-Green Deployment
```bash
# Deploy green version
kubectl apply -f infrastructure/kubernetes/green/

# Switch traffic to green
kubectl patch service mss-frontend -p '{"spec":{"selector":{"version":"green"}}}'

# Remove blue version after validation
kubectl delete -f infrastructure/kubernetes/blue/
```

### Canary Deployment
```yaml
# 10% traffic to new version
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: mss-frontend
spec:
  http:
  - match:
    - headers:
        canary:
          exact: "true"
    route:
    - destination:
        host: mss-frontend
        subset: v2
      weight: 10
    - destination:
        host: mss-frontend
        subset: v1
      weight: 90
```

### Rollback Procedures
```bash
# Immediate rollback
kubectl rollout undo deployment/mss-frontend

# Rollback to specific revision
kubectl rollout undo deployment/mss-frontend --to-revision=2

# Check rollout history
kubectl rollout history deployment/mss-frontend
```

## Disaster Recovery

### Backup Strategy
1. **Database Backups**
   - Daily automated backups
   - Point-in-time recovery enabled
   - Geo-replicated storage

2. **Application State**
   - Redis snapshots every hour
   - Session state in Redis
   - Stateless application design

3. **Configuration Backups**
   - Git repository for all configs
   - Kubernetes etcd backups
   - Secrets backup in vault

### Recovery Procedures
```bash
# Database recovery
pg_restore -h postgres -U admin -d mss_platform backup.dump

# Redis recovery
redis-cli --rdb /backup/dump.rdb

# Full platform recovery
kubectl apply -k infrastructure/kubernetes/disaster-recovery/
```

### RTO/RPO Targets
- **RTO (Recovery Time Objective)**: 1 hour
- **RPO (Recovery Point Objective)**: 15 minutes
- **Uptime SLA**: 99.9% (43.8 minutes/month)

## Operational Runbooks

### Common Operations

#### Scale Services
```bash
# Scale frontend
kubectl scale deployment mss-frontend --replicas=5

# Scale API
kubectl scale deployment mss-api --replicas=5
```

#### Update Configurations
```bash
# Update ConfigMap
kubectl edit configmap mss-config

# Restart pods to pick up changes
kubectl rollout restart deployment/mss-frontend
```

#### Debug Issues
```bash
# Check pod logs
kubectl logs -f deployment/mss-frontend

# Execute into pod
kubectl exec -it deployment/mss-api -- /bin/sh

# Check events
kubectl get events --sort-by='.lastTimestamp'
```

## Monitoring Access

### Service URLs
- **Grafana**: http://localhost:3003 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Jaeger**: http://localhost:16686
- **Application**: http://localhost:3000

### Starting Monitoring Stack
```bash
# Start monitoring services
docker-compose -f infrastructure/monitoring/docker-compose.monitoring.yml up -d

# Verify services
docker-compose -f infrastructure/monitoring/docker-compose.monitoring.yml ps
```

## Contact & Support

### Escalation Path
1. **L1 Support**: Automated alerts → On-call engineer
2. **L2 Support**: Infrastructure team
3. **L3 Support**: Platform architects

### Documentation
- This document: Infrastructure overview
- `DEVELOPMENT.md`: Development setup
- `SECURITY.md`: Security procedures
- `API_DOCUMENTATION.md`: API specifications

---

*Last Updated: August 2025*
*Version: 2.0.0*
*Maintained by: Claude-D (DevOps/Infrastructure)*