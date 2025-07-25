Last login: Fri Jul 25 08:33:58 on ttys058
cd '/Users/brendantoole/projects2/gridmate/backend' && echo '--- Go Backend Service ---' && LOG_LEVEL=debug go run cmd/api/main.go
brendantoole@Mac ~ % cd '/Users/brendantoole/projects2/gridmate/backend' && echo '--- Go Backend Service ---' && LOG_LEVEL=debug go run cmd/api/main.go
--- Go Backend Service ---
{"level":"info","message":"Database connection established","time":"2025-07-25T08:34:00.873Z"}
2025/07/25 08:34:00 Starting migrations from path: ./migrations
2025/07/25 08:34:01 Current migration version: 4, dirty: false
2025/07/25 08:34:01 Database migrated to version 4
{"level":"info","executor_is_nil":false,"time":"2025-07-25T08:34:01-04:00","message":"SetToolExecutor called"}
{"level":"info","message":"Tool executor, context builder, and queued ops registry set in AI service","time":"2025-07-25T08:34:01.148Z"}
{"level":"info","message":"Vector memory indexing service initialized with OpenAI embeddings","time":"2025-07-25T08:34:01.148Z"}
{"level":"info","executor_is_nil":false,"time":"2025-07-25T08:34:01-04:00","message":"SetToolExecutor called"}
{"level":"info","message":"Tool executor transferred to main AI service","time":"2025-07-25T08:34:01.148Z"}
{"level":"info","message":"Embedding provider set on tool executor for memory search","time":"2025-07-25T08:34:01.148Z"}
{"level":"info","message":"Context builder transferred to main AI service","time":"2025-07-25T08:34:01.148Z"}
{"level":"info","message":"Queued operations registry transferred to main AI service","time":"2025-07-25T08:34:01.148Z"}
{"level":"info","message":"Initializing advanced AI components (memory, context analyzer, orchestrator)","time":"2025-07-25T08:34:01.148Z"}
{"level":"info","memory_service":true,"context_analyzer":true,"tool_orchestrator":true,"time":"2025-07-25T08:34:01-04:00","message":"Advanced AI components configured"}
{"level":"info","message":"Advanced AI components successfully initialized and connected","time":"2025-07-25T08:34:01.148Z"}
{"level":"info","message":"Starting server on port 8080","time":"2025-07-25T08:34:01.148Z"}
{"autonomy_mode":"agent-default","content":"Please make DCF model in this sheet, use mock data","content_length":50,"level":"info","message":"[STREAMING] Starting streaming chat request","session_id":"session_638890436694157830","time":"2025-07-25T08:34:37.022Z","timestamp":"2025-07-25T08:34:37.022896-04:00"}
{"existing":false,"level":"debug","message":"[STREAMING] Created new session","session_id":"session_638890436694157830","time":"2025-07-25T08:34:37.022Z"}
{"level":"debug","message":"[STREAMING] Session ready for streaming","session_id":"session_638890436694157830","session_ptr":"0x14000118100","time":"2025-07-25T08:34:37.022Z"}
{"deadline":"0001-01-01T00:00:00Z","has_deadline":false,"level":"debug","message":"[STREAMING] Calling ProcessChatMessageStreaming","session_id":"session_638890436694157830","time":"2025-07-25T08:34:37.022Z"}
{"client_id":"session_638890436694157830","has_memory":true,"level":"info","message":"Created new session with memory store","session_id":"session_638890436694157830","time":"2025-07-25T08:34:37.023Z"}
{"level":"info","message":"Session registered","session_id":"session_638890436694157830","time":"2025-07-25T08:34:37.023Z","type":"api","user_id":"session_638890436694157830"}
{"level":"debug","session_id":"session_638890436694157830","initial_client_id":"session_638890436694157830","has_client_id_resolver":true,"time":"2025-07-25T08:34:37-04:00","message":"Starting client ID resolution"}
{"level":"debug","message":"Client ID resolver called","session_id":"session_638890436694157830","time":"2025-07-25T08:34:37.023Z","total_sessions":1}
{"available_session_id":"session_638890436694157830","client_id":"session_638890436694157830","level":"debug","message":"Available session in resolver","time":"2025-07-25T08:34:37.023Z","user_id":""}
{"client_id":"session_638890436694157830","level":"info","message":"Client ID resolver found session","session_id":"session_638890436694157830","time":"2025-07-25T08:34:37.023Z","user_id":""}
{"level":"debug","session_id":"session_638890436694157830","resolved_client_id":"session_638890436694157830","time":"2025-07-25T08:34:37-04:00","message":"Client ID resolved via resolver function"}
{"level":"info","session_id":"session_638890436694157830","final_client_id":"session_638890436694157830","request_id":"f939379a-07e1-42e0-a2d8-f2ec7891415e","session_equals_client":true,"time":"2025-07-25T08:34:37-04:00","message":"Final client ID resolution for tool request"}
{"level":"info","session_id":"session_638890436694157830","client_id":"session_638890436694157830","request_id":"f939379a-07e1-42e0-a2d8-f2ec7891415e","time":"2025-07-25T08:34:37-04:00","message":"Registering tool handler for response"}
{"level":"info","session_id":"session_638890436694157830","request_id":"f939379a-07e1-42e0-a2d8-f2ec7891415e","time":"2025-07-25T08:34:37-04:00","message":"Sending tool request via SignalR bridge"}

