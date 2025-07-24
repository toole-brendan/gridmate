Last login: Thu Jul 24 12:29:16 on ttys023
cd '/Users/brendantoole/projects2/gridmate/backend' && echo '--- Go Backend Service ---' && LOG_LEVEL=debug go run cmd/api/main.go
brendantoole@Mac ~ % cd '/Users/brendantoole/projects2/gridmate/backend' && echo '--- Go Backend Service ---' && LOG_LEVEL=debug go run cmd/api/main.go
--- Go Backend Service ---
{"level":"info","message":"Database connection established","time":"2025-07-24T12:29:17.609Z"}
2025/07/24 12:29:17 Starting migrations from path: ./migrations
2025/07/24 12:29:17 Current migration version: 4, dirty: false
2025/07/24 12:29:17 Database migrated to version 4
{"level":"info","executor_is_nil":false,"time":"2025-07-24T12:29:17-04:00","message":"SetToolExecutor called"}
{"level":"info","message":"Tool executor, context builder, and queued ops registry set in AI service","time":"2025-07-24T12:29:17.879Z"}
{"level":"info","message":"Vector memory indexing service initialized with OpenAI embeddings","time":"2025-07-24T12:29:17.879Z"}
{"level":"info","executor_is_nil":false,"time":"2025-07-24T12:29:17-04:00","message":"SetToolExecutor called"}
{"level":"info","message":"Tool executor transferred to main AI service","time":"2025-07-24T12:29:17.879Z"}
{"level":"info","message":"Embedding provider set on tool executor for memory search","time":"2025-07-24T12:29:17.879Z"}
{"level":"info","message":"Context builder transferred to main AI service","time":"2025-07-24T12:29:17.879Z"}
{"level":"info","message":"Queued operations registry transferred to main AI service","time":"2025-07-24T12:29:17.879Z"}
{"level":"info","message":"Initializing advanced AI components (memory, context analyzer, orchestrator)","time":"2025-07-24T12:29:17.879Z"}
{"level":"info","memory_service":true,"context_analyzer":true,"tool_orchestrator":true,"time":"2025-07-24T12:29:17-04:00","message":"Advanced AI components configured"}
{"level":"info","message":"Advanced AI components successfully initialized and connected","time":"2025-07-24T12:29:17.879Z"}
{"level":"info","message":"Starting server on port 8080","time":"2025-07-24T12:29:17.879Z"}
{"autonomy_mode":"agent-default","content":"Please make DCF model in this sheet, use mock data","level":"info","message":"Starting streaming chat request","session_id":"session_638889713610028630","time":"2025-07-24T12:29:35.228Z"}
{"client_id":"session_638889713610028630","has_memory":true,"level":"info","message":"Created new session with memory store","session_id":"session_638889713610028630","time":"2025-07-24T12:29:35.228Z"}
{"level":"info","message":"Session registered","session_id":"session_638889713610028630","time":"2025-07-24T12:29:35.228Z","type":"api","user_id":"session_638889713610028630"}
{"autonomy_mode":"agent-default","history_length":0,"level":"info","message":"Starting streaming chat processing","session_id":"session_638889713610028630","time":"2025-07-24T12:29:35.228Z"}
{"level":"info","session":"session_638889713610028630","tools_count":19,"autonomy_mode":"agent-default","time":"2025-07-24T12:29:35-04:00","message":"Starting streaming chat with tools and history"}
{"level":"warning","message":"ResponseWriter does not support flushing, attempting to continue anyway","time":"2025-07-24T12:29:35.228Z"}
{"chunk_number":1,"chunk_type":"text","elapsed_ms":1221,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:29:36.450Z"}
{"chunk_number":2,"chunk_type":"text","elapsed_ms":1357,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:29:36.586Z"}
{"chunk_number":3,"chunk_type":"text","elapsed_ms":1473,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:29:36.701Z"}
{"chunk_number":4,"chunk_type":"text","elapsed_ms":1524,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:29:36.752Z"}
{"chunk_number":5,"chunk_type":"text","elapsed_ms":1571,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:29:36.799Z"}
{"chunk_number":6,"chunk_type":"text","elapsed_ms":1618,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:29:36.846Z"}
{"chunk_number":7,"chunk_type":"text","elapsed_ms":1666,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:29:36.895Z"}
{"chunk_number":8,"chunk_type":"text","elapsed_ms":1763,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:29:36.992Z"}
{"chunk_number":9,"chunk_type":"text","elapsed_ms":1855,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:29:37.083Z"}
{"chunk_number":10,"chunk_type":"text","elapsed_ms":1996,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:29:37.224Z"}
{"chunk_number":11,"chunk_type":"text","elapsed_ms":2050,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:29:37.279Z"}
{"chunk_number":12,"chunk_type":"text","elapsed_ms":2099,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:29:37.327Z"}
{"chunk_number":13,"chunk_type":"text","elapsed_ms":2186,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:29:37.415Z"}
{"chunk_number":14,"chunk_type":"text","elapsed_ms":2283,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:29:37.512Z"}
{"chunk_number":15,"chunk_type":"text","elapsed_ms":2332,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:29:37.560Z"}
{"chunk_number":16,"chunk_type":"text","elapsed_ms":2377,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:29:37.606Z"}
{"chunk_number":17,"chunk_type":"text","elapsed_ms":2522,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:29:37.751Z"}
{"chunk_number":18,"chunk_type":"tool_start","elapsed_ms":2769,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:29:37.997Z"}
{"chunk_number":19,"chunk_type":"tool_progress","elapsed_ms":2769,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:29:37.997Z"}
{"chunk_number":20,"chunk_type":"tool_progress","elapsed_ms":3252,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:29:38.481Z"}
{"chunk_number":21,"chunk_type":"tool_progress","elapsed_ms":3252,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:29:38.481Z"}
{"chunk_number":22,"chunk_type":"tool_progress","elapsed_ms":3252,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:29:38.481Z"}
{"chunk_number":23,"chunk_type":"tool_progress","elapsed_ms":3252,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:29:38.481Z"}
{"chunk_number":24,"chunk_type":"tool_progress","elapsed_ms":3579,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:29:38.808Z"}
{"chunk_number":25,"chunk_type":"tool_progress","elapsed_ms":3579,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:29:38.808Z"}
{"chunk_number":26,"chunk_type":"tool_progress","elapsed_ms":3579,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:29:38.808Z"}
{"chunk_number":27,"chunk_type":"tool_progress","elapsed_ms":3579,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:29:38.808Z"}
{"chunk_number":28,"chunk_type":"tool_progress","elapsed_ms":3579,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:29:38.808Z"}
{"chunk_number":29,"chunk_type":"tool_progress","elapsed_ms":3579,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:29:38.808Z"}
{"chunk_number":30,"chunk_type":"tool_progress","elapsed_ms":3579,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:29:38.808Z"}
{"chunk_number":31,"chunk_type":"tool_progress","elapsed_ms":3580,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:29:38.808Z"}
{"chunk_number":32,"chunk_type":"tool_progress","elapsed_ms":3580,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:29:38.808Z"}
{"chunk_number":33,"chunk_type":"tool_progress","elapsed_ms":3580,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:29:38.808Z"}
{"chunk_number":34,"chunk_type":"tool_progress","elapsed_ms":3729,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:29:38.957Z"}
{"chunk_number":35,"chunk_type":"tool_progress","elapsed_ms":3729,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:29:38.957Z"}
{"chunk_number":36,"chunk_type":"tool_progress","elapsed_ms":3729,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:29:38.957Z"}
{"chunk_number":37,"chunk_type":"tool_progress","elapsed_ms":3729,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:29:38.957Z"}
{"chunk_number":38,"chunk_type":"tool_complete","elapsed_ms":3729,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:29:38.957Z"}
{"chunk_number":39,"chunk_type":"","elapsed_ms":3729,"has_delta":false,"is_done":true,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:29:38.957Z"}
{"content_length":274,"level":"info","message":"Streaming completed, saved to history","session_id":"session_638889713610028630","time":"2025-07-24T12:29:38.958Z"}
{"duration_ms":3729,"level":"info","message":"Streaming completed successfully","time":"2025-07-24T12:29:38.958Z","total_chunks":39}
{"duration_ms":3729,"level":"info","message":"Request processed successfully","method":"GET","path":"/api/chat/stream","query":"sessionId=session_638889713610028630\u0026content=Please%20make%20DCF%20model%20in%20this%20sheet%2C%20use%20mock%20data\u0026autonomyMode=agent-default\u0026token=dev-token-123","remote_ip":"[::1]","request_id":"51660bff-5614-438f-8726-2adb8ed6d4ff","route_pattern":"/api/chat/stream","size":6518,"status":200,"time":"2025-07-24T12:29:38.958Z","user_agent":""}

