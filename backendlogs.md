Last login: Thu Jul 24 15:58:31 on ttys043
cd '/Users/brendantoole/projects2/gridmate/backend' && echo '--- Go Backend Service ---' && LOG_LEVEL=debug go run cmd/api/main.go
brendantoole@Mac ~ % cd '/Users/brendantoole/projects2/gridmate/backend' && echo '--- Go Backend Service ---' && LOG_LEVEL=debug go run cmd/api/main.go
--- Go Backend Service ---
{"level":"info","message":"Database connection established","time":"2025-07-24T15:58:32.189Z"}
2025/07/24 15:58:32 Starting migrations from path: ./migrations
2025/07/24 15:58:32 Current migration version: 4, dirty: false
2025/07/24 15:58:32 Database migrated to version 4
{"level":"info","executor_is_nil":false,"time":"2025-07-24T15:58:32-04:00","message":"SetToolExecutor called"}
{"level":"info","message":"Tool executor, context builder, and queued ops registry set in AI service","time":"2025-07-24T15:58:32.460Z"}
{"level":"info","message":"Vector memory indexing service initialized with OpenAI embeddings","time":"2025-07-24T15:58:32.460Z"}
{"level":"info","executor_is_nil":false,"time":"2025-07-24T15:58:32-04:00","message":"SetToolExecutor called"}
{"level":"info","message":"Tool executor transferred to main AI service","time":"2025-07-24T15:58:32.460Z"}
{"level":"info","message":"Embedding provider set on tool executor for memory search","time":"2025-07-24T15:58:32.460Z"}
{"level":"info","message":"Context builder transferred to main AI service","time":"2025-07-24T15:58:32.460Z"}
{"level":"info","message":"Queued operations registry transferred to main AI service","time":"2025-07-24T15:58:32.460Z"}
{"level":"info","message":"Initializing advanced AI components (memory, context analyzer, orchestrator)","time":"2025-07-24T15:58:32.460Z"}
{"level":"info","memory_service":true,"context_analyzer":true,"tool_orchestrator":true,"time":"2025-07-24T15:58:32-04:00","message":"Advanced AI components configured"}
{"level":"info","message":"Advanced AI components successfully initialized and connected","time":"2025-07-24T15:58:32.461Z"}
{"level":"info","message":"Starting server on port 8080","time":"2025-07-24T15:58:32.461Z"}
{"autonomy_mode":"agent-default","content":"Please make DCF model in this sheet, use mock data","level":"info","message":"Starting streaming chat request","session_id":"session_638889839245097150","time":"2025-07-24T15:58:53.224Z"}
{"client_id":"session_638889839245097150","has_memory":true,"level":"info","message":"Created new session with memory store","session_id":"session_638889839245097150","time":"2025-07-24T15:58:53.224Z"}
{"level":"info","message":"Session registered","session_id":"session_638889839245097150","time":"2025-07-24T15:58:53.224Z","type":"api","user_id":"session_638889839245097150"}
{"autonomy_mode":"agent-default","history_length":0,"level":"info","message":"Starting streaming chat processing","session_id":"session_638889839245097150","time":"2025-07-24T15:58:53.224Z"}
{"level":"info","session":"session_638889839245097150","tools_count":19,"autonomy_mode":"agent-default","time":"2025-07-24T15:58:53-04:00","message":"Starting streaming chat with tools and history"}
{"level":"warning","message":"ResponseWriter does not support flushing, attempting to continue anyway","time":"2025-07-24T15:58:53.224Z"}
{"chunk_type":"text","first_chunk_delay_ms":2435,"level":"info","message":"First chunk being sent - streaming is active","time":"2025-07-24T15:58:55.660Z"}
{"chunk_number":1,"chunk_type":"text","elapsed_ms":2435,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T15:58:55.660Z"}
{"chunk_number":2,"chunk_type":"text","elapsed_ms":2683,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T15:58:55.908Z"}
{"chunk_number":3,"chunk_type":"text","elapsed_ms":2789,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T15:58:56.014Z"}
{"chunk_number":4,"chunk_type":"text","elapsed_ms":2983,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T15:58:56.208Z"}
{"chunk_number":5,"chunk_type":"text","elapsed_ms":3212,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T15:58:56.437Z"}
{"chunk_number":6,"chunk_type":"text","elapsed_ms":3405,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T15:58:56.629Z"}
{"chunk_number":7,"chunk_type":"text","elapsed_ms":3552,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T15:58:56.777Z"}
{"chunk_number":8,"chunk_type":"tool_start","elapsed_ms":3838,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T15:58:57.063Z"}
{"chunk_number":9,"chunk_type":"tool_progress","elapsed_ms":3838,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T15:58:57.063Z"}
{"chunk_number":10,"chunk_type":"tool_progress","elapsed_ms":4543,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T15:58:57.768Z"}
{"chunk_number":11,"chunk_type":"tool_progress","elapsed_ms":4543,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T15:58:57.768Z"}
{"chunk_number":12,"chunk_type":"tool_progress","elapsed_ms":4543,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T15:58:57.768Z"}
{"chunk_number":13,"chunk_type":"tool_progress","elapsed_ms":4543,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T15:58:57.768Z"}
{"chunk_number":14,"chunk_type":"tool_progress","elapsed_ms":4653,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T15:58:57.878Z"}
{"chunk_number":15,"chunk_type":"tool_progress","elapsed_ms":4654,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T15:58:57.878Z"}
{"chunk_number":16,"chunk_type":"tool_progress","elapsed_ms":4654,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T15:58:57.879Z"}
{"chunk_number":17,"chunk_type":"tool_progress","elapsed_ms":4657,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T15:58:57.881Z"}
{"chunk_number":18,"chunk_type":"tool_progress","elapsed_ms":4657,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T15:58:57.882Z"}
{"chunk_number":19,"chunk_type":"tool_progress","elapsed_ms":4659,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T15:58:57.884Z"}
{"chunk_number":20,"chunk_type":"tool_progress","elapsed_ms":4660,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T15:58:57.885Z"}
{"chunk_number":21,"chunk_type":"tool_progress","elapsed_ms":4665,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T15:58:57.890Z"}
{"chunk_number":22,"chunk_type":"tool_progress","elapsed_ms":4667,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T15:58:57.892Z"}
{"chunk_number":23,"chunk_type":"tool_progress","elapsed_ms":4670,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T15:58:57.895Z"}
{"chunk_number":24,"chunk_type":"tool_progress","elapsed_ms":4671,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T15:58:57.896Z"}
{"chunk_number":25,"chunk_type":"tool_progress","elapsed_ms":4671,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T15:58:57.896Z"}
{"content_length":229,"level":"info","message":"Streaming completed, saved to history","session_id":"session_638889839245097150","time":"2025-07-24T15:58:57.899Z"}
{"chunk_number":26,"chunk_type":"tool_complete","elapsed_ms":4674,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T15:58:57.899Z"}
{"chunk_number":27,"chunk_type":"","elapsed_ms":4674,"has_delta":false,"is_done":true,"level":"debug","message":"Sending chunk","time":"2025-07-24T15:58:57.899Z"}
{"avg_chunk_time_ms":173,"duration_ms":4674,"level":"info","message":"Streaming completed","time":"2025-07-24T15:58:57.899Z","total_chunks":27}
{"duration_ms":4674,"level":"info","message":"Request processed successfully","method":"GET","path":"/api/chat/stream","query":"sessionId=session_638889839245097150\u0026content=Please%20make%20DCF%20model%20in%20this%20sheet%2C%20use%20mock%20data\u0026autonomyMode=agent-default\u0026token=dev-token-123","remote_ip":"[::1]","request_id":"78850228-2929-40b8-a2d6-3d909169577b","route_pattern":"/api/chat/stream","size":5064,"status":200,"time":"2025-07-24T15:58:57.899Z","user_agent":""}
{"content_length":229,"level":"info","message":"Streaming completed, saved to history","session_id":"session_638889839245097150","time":"2025-07-24T15:58:57.899Z"}

