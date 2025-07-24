Last login: Thu Jul 24 13:04:06 on ttys025
cd '/Users/brendantoole/projects2/gridmate/backend' && echo '--- Go Backend Service ---' && LOG_LEVEL=debug go run cmd/api/main.go
brendantoole@Mac ~ % cd '/Users/brendantoole/projects2/gridmate/backend' && echo '--- Go Backend Service ---' && LOG_LEVEL=debug go run cmd/api/main.go
--- Go Backend Service ---
{"level":"info","message":"Database connection established","time":"2025-07-24T13:04:07.516Z"}
2025/07/24 13:04:07 Starting migrations from path: ./migrations
2025/07/24 13:04:07 Current migration version: 4, dirty: false
2025/07/24 13:04:07 Database migrated to version 4
{"level":"info","executor_is_nil":false,"time":"2025-07-24T13:04:07-04:00","message":"SetToolExecutor called"}
{"level":"info","message":"Tool executor, context builder, and queued ops registry set in AI service","time":"2025-07-24T13:04:07.789Z"}
{"level":"info","message":"Vector memory indexing service initialized with OpenAI embeddings","time":"2025-07-24T13:04:07.789Z"}
{"level":"info","executor_is_nil":false,"time":"2025-07-24T13:04:07-04:00","message":"SetToolExecutor called"}
{"level":"info","message":"Tool executor transferred to main AI service","time":"2025-07-24T13:04:07.789Z"}
{"level":"info","message":"Embedding provider set on tool executor for memory search","time":"2025-07-24T13:04:07.789Z"}
{"level":"info","message":"Context builder transferred to main AI service","time":"2025-07-24T13:04:07.789Z"}
{"level":"info","message":"Queued operations registry transferred to main AI service","time":"2025-07-24T13:04:07.789Z"}
{"level":"info","message":"Initializing advanced AI components (memory, context analyzer, orchestrator)","time":"2025-07-24T13:04:07.789Z"}
{"level":"info","memory_service":true,"context_analyzer":true,"tool_orchestrator":true,"time":"2025-07-24T13:04:07-04:00","message":"Advanced AI components configured"}
{"level":"info","message":"Advanced AI components successfully initialized and connected","time":"2025-07-24T13:04:07.789Z"}
{"level":"info","message":"Starting server on port 8080","time":"2025-07-24T13:04:07.789Z"}
{"autonomy_mode":"agent-default","content":"Please make DCF model in this sheet, use mock data","level":"info","message":"Starting streaming chat request","session_id":"session_638889734599242320","time":"2025-07-24T13:04:24.883Z"}
{"client_id":"session_638889734599242320","has_memory":true,"level":"info","message":"Created new session with memory store","session_id":"session_638889734599242320","time":"2025-07-24T13:04:24.883Z"}
{"level":"info","message":"Session registered","session_id":"session_638889734599242320","time":"2025-07-24T13:04:24.883Z","type":"api","user_id":"session_638889734599242320"}
{"autonomy_mode":"agent-default","history_length":0,"level":"info","message":"Starting streaming chat processing","session_id":"session_638889734599242320","time":"2025-07-24T13:04:24.883Z"}
{"level":"info","session":"session_638889734599242320","tools_count":19,"autonomy_mode":"agent-default","time":"2025-07-24T13:04:24-04:00","message":"Starting streaming chat with tools and history"}
{"level":"warning","message":"ResponseWriter does not support flushing, attempting to continue anyway","time":"2025-07-24T13:04:24.883Z"}
{"chunk_number":1,"chunk_type":"","elapsed_ms":10765,"has_delta":false,"is_done":true,"level":"debug","message":"Sending chunk","time":"2025-07-24T13:04:35.648Z"}
{"duration_ms":10765,"level":"info","message":"Streaming completed successfully","time":"2025-07-24T13:04:35.648Z","total_chunks":1}
{"duration_ms":10765,"level":"info","message":"Request processed successfully","method":"GET","path":"/api/chat/stream","query":"sessionId=session_638889734599242320\u0026content=Please%20make%20DCF%20model%20in%20this%20sheet%2C%20use%20mock%20data\u0026autonomyMode=agent-default\u0026token=dev-token-123","remote_ip":"[::1]","request_id":"42038ceb-61a6-4529-bc5a-2d5a5696b281","route_pattern":"/api/chat/stream","size":122,"status":200,"time":"2025-07-24T13:04:35.648Z","user_agent":""}

