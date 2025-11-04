-- CreateTable
CREATE TABLE IF NOT EXISTS "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT,
    "region" TEXT DEFAULT 'us-east-1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "jobs" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "spec" JSONB NOT NULL,
    "result" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "tasks" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "payload" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "memory" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL DEFAULT '__org__',
    "text" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "artifacts" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "path" TEXT,
    "url" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "bots" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "graph_edges" (
    "id" TEXT NOT NULL,
    "fromType" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toType" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "rel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "graph_edges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "kpi_snapshots" (
    "id" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kpis" JSONB NOT NULL,
    "region" TEXT NOT NULL DEFAULT 'us-east-1',

    CONSTRAINT "kpi_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "projects_userId_idx" ON "projects"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "projects_region_idx" ON "projects"("region");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "jobs_projectId_idx" ON "jobs"("projectId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "jobs_status_idx" ON "jobs"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "jobs_createdAt_idx" ON "jobs"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tasks_projectId_idx" ON "tasks"("projectId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tasks_type_status_idx" ON "tasks"("type", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tasks_createdAt_idx" ON "tasks"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "memory_projectId_idx" ON "memory"("projectId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "memory_createdAt_idx" ON "memory"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "artifacts_jobId_idx" ON "artifacts"("jobId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "artifacts_projectId_idx" ON "artifacts"("projectId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "artifacts_type_idx" ON "artifacts"("type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "bots_role_idx" ON "bots"("role");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "bots_status_idx" ON "bots"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "graph_edges_fromType_fromId_idx" ON "graph_edges"("fromType", "fromId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "graph_edges_toType_toId_idx" ON "graph_edges"("toType", "toId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "graph_edges_rel_idx" ON "graph_edges"("rel");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "kpi_snapshots_ts_idx" ON "kpi_snapshots"("ts");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "kpi_snapshots_region_idx" ON "kpi_snapshots"("region");

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memory" ADD CONSTRAINT "memory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

