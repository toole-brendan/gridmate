Last login: Thu Jul 24 11:38:14 on ttys014
cd '/Users/brendantoole/projects2/gridmate/backend' && echo '--- Go Backend Service ---' && LOG_LEVEL=debug go run cmd/api/main.go
brendantoole@Mac ~ % cd '/Users/brendantoole/projects2/gridmate/backend' && echo '--- Go Backend Service ---' && LOG_LEVEL=debug go run cmd/api/main.go
--- Go Backend Service ---
{"level":"info","message":"Database connection established","time":"2025-07-24T11:38:16.406Z"}
2025/07/24 11:38:16 Starting migrations from path: ./migrations
2025/07/24 11:38:16 Current migration version: 4, dirty: false
2025/07/24 11:38:16 Database migrated to version 4
{"level":"info","executor_is_nil":false,"time":"2025-07-24T11:38:16-04:00","message":"SetToolExecutor called"}
{"level":"info","message":"Tool executor, context builder, and queued ops registry set in AI service","time":"2025-07-24T11:38:16.678Z"}
{"level":"info","message":"Vector memory indexing service initialized with OpenAI embeddings","time":"2025-07-24T11:38:16.678Z"}
{"level":"info","executor_is_nil":false,"time":"2025-07-24T11:38:16-04:00","message":"SetToolExecutor called"}
{"level":"info","message":"Tool executor transferred to main AI service","time":"2025-07-24T11:38:16.678Z"}
{"level":"info","message":"Embedding provider set on tool executor for memory search","time":"2025-07-24T11:38:16.678Z"}
{"level":"info","message":"Context builder transferred to main AI service","time":"2025-07-24T11:38:16.678Z"}
{"level":"info","message":"Queued operations registry transferred to main AI service","time":"2025-07-24T11:38:16.678Z"}
{"level":"info","message":"Initializing advanced AI components (memory, context analyzer, orchestrator)","time":"2025-07-24T11:38:16.678Z"}
{"level":"info","memory_service":true,"context_analyzer":true,"tool_orchestrator":true,"time":"2025-07-24T11:38:16-04:00","message":"Advanced AI components configured"}
{"level":"info","message":"Advanced AI components successfully initialized and connected","time":"2025-07-24T11:38:16.678Z"}
{"level":"info","message":"Starting server on port 8080","time":"2025-07-24T11:38:16.678Z"}
{"autonomy_mode":"agent-default","content":"Please make DCF model in this sheet, use mock data","level":"info","message":"Starting streaming chat request","session_id":"session_638889683020138520","time":"2025-07-24T11:38:31.989Z"}
{"client_id":"session_638889683020138520","has_memory":true,"level":"info","message":"Created new session with memory store","session_id":"session_638889683020138520","time":"2025-07-24T11:38:31.989Z"}
{"level":"info","message":"Session registered","session_id":"session_638889683020138520","time":"2025-07-24T11:38:31.989Z","type":"api","user_id":"session_638889683020138520"}
{"autonomy_mode":"agent-default","history_length":0,"level":"info","message":"Starting streaming chat processing","session_id":"session_638889683020138520","time":"2025-07-24T11:38:31.989Z"}
{"level":"info","session":"session_638889683020138520","tools_count":19,"autonomy_mode":"agent-default","time":"2025-07-24T11:38:31-04:00","message":"Starting streaming chat with tools and history"}
{"level":"warning","message":"ResponseWriter does not support flushing, attempting to continue anyway","time":"2025-07-24T11:38:31.989Z"}
{"level":"info","message":"Streaming completed successfully","time":"2025-07-24T11:38:35.669Z"}
{"duration_ms":3680,"level":"info","message":"Request processed successfully","method":"GET","path":"/api/chat/stream","query":"sessionId=session_638889683020138520\u0026content=Please%20make%20DCF%20model%20in%20this%20sheet%2C%20use%20mock%20data\u0026autonomyMode=agent-default\u0026token=dev-token-123","remote_ip":"[::1]","request_id":"3ef12b3b-740b-441b-a51c-af3c230d3a79","route_pattern":"/api/chat/stream","size":6214,"status":200,"time":"2025-07-24T11:38:35.669Z","user_agent":""}
{"content_length":281,"level":"info","message":"Streaming completed, saved to history","session_id":"session_638889683020138520","time":"2025-07-24T11:38:35.669Z"}

