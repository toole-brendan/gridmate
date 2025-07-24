Last login: Thu Jul 24 10:45:30 on ttys015
cd '/Users/brendantoole/projects2/gridmate/backend' && echo '--- Go Backend Service ---' && LOG_LEVEL=debug go run cmd/api/main.go
brendantoole@Mac ~ % cd '/Users/brendantoole/projects2/gridmate/backend' && echo '--- Go Backend Service ---' && LOG_LEVEL=debug go run cmd/api/main.go
--- Go Backend Service ---
{"level":"info","message":"Database connection established","time":"2025-07-24T10:45:31.816Z"}
2025/07/24 10:45:31 Starting migrations from path: ./migrations
2025/07/24 10:45:31 Current migration version: 4, dirty: false
2025/07/24 10:45:32 Database migrated to version 4
{"level":"info","executor_is_nil":false,"time":"2025-07-24T10:45:32-04:00","message":"SetToolExecutor called"}
{"level":"info","message":"Tool executor, context builder, and queued ops registry set in AI service","time":"2025-07-24T10:45:32.088Z"}
{"level":"info","message":"Vector memory indexing service initialized with OpenAI embeddings","time":"2025-07-24T10:45:32.088Z"}
{"level":"info","executor_is_nil":false,"time":"2025-07-24T10:45:32-04:00","message":"SetToolExecutor called"}
{"level":"info","message":"Tool executor transferred to main AI service","time":"2025-07-24T10:45:32.088Z"}
{"level":"info","message":"Embedding provider set on tool executor for memory search","time":"2025-07-24T10:45:32.088Z"}
{"level":"info","message":"Context builder transferred to main AI service","time":"2025-07-24T10:45:32.088Z"}
{"level":"info","message":"Queued operations registry transferred to main AI service","time":"2025-07-24T10:45:32.088Z"}
{"level":"info","message":"Initializing advanced AI components (memory, context analyzer, orchestrator)","time":"2025-07-24T10:45:32.088Z"}
{"level":"info","memory_service":true,"context_analyzer":true,"tool_orchestrator":true,"time":"2025-07-24T10:45:32-04:00","message":"Advanced AI components configured"}
{"level":"info","message":"Advanced AI components successfully initialized and connected","time":"2025-07-24T10:45:32.088Z"}
{"level":"info","message":"Starting server on port 8080","time":"2025-07-24T10:45:32.089Z"}

