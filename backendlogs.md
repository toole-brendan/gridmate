Last login: Thu Jul 24 13:26:21 on ttys021
cd '/Users/brendantoole/projects2/gridmate/backend' && echo '--- Go Backend Service ---' && LOG_LEVEL=debug go run cmd/api/main.go
brendantoole@Mac ~ % cd '/Users/brendantoole/projects2/gridmate/backend' && echo '--- Go Backend Service ---' && LOG_LEVEL=debug go run cmd/api/main.go
--- Go Backend Service ---
{"level":"info","message":"Database connection established","time":"2025-07-24T13:26:23.688Z"}
2025/07/24 13:26:23 Starting migrations from path: ./migrations
2025/07/24 13:26:23 Current migration version: 4, dirty: false
2025/07/24 13:26:23 Database migrated to version 4
{"level":"info","executor_is_nil":false,"time":"2025-07-24T13:26:23-04:00","message":"SetToolExecutor called"}
{"level":"info","message":"Tool executor, context builder, and queued ops registry set in AI service","time":"2025-07-24T13:26:23.966Z"}
{"level":"info","message":"Vector memory indexing service initialized with OpenAI embeddings","time":"2025-07-24T13:26:23.966Z"}
{"level":"info","executor_is_nil":false,"time":"2025-07-24T13:26:23-04:00","message":"SetToolExecutor called"}
{"level":"info","message":"Tool executor transferred to main AI service","time":"2025-07-24T13:26:23.966Z"}
{"level":"info","message":"Embedding provider set on tool executor for memory search","time":"2025-07-24T13:26:23.966Z"}
{"level":"info","message":"Context builder transferred to main AI service","time":"2025-07-24T13:26:23.966Z"}
{"level":"info","message":"Queued operations registry transferred to main AI service","time":"2025-07-24T13:26:23.966Z"}
{"level":"info","message":"Initializing advanced AI components (memory, context analyzer, orchestrator)","time":"2025-07-24T13:26:23.966Z"}
{"level":"info","memory_service":true,"context_analyzer":true,"tool_orchestrator":true,"time":"2025-07-24T13:26:23-04:00","message":"Advanced AI components configured"}
{"level":"info","message":"Advanced AI components successfully initialized and connected","time":"2025-07-24T13:26:23.966Z"}
{"level":"info","message":"Starting server on port 8080","time":"2025-07-24T13:26:23.967Z"}
{"autonomy_mode":"agent-default","content":"Please make DCF model in this sheet, use mock data","level":"info","message":"Starting streaming chat request","session_id":"session_638889748000156830","time":"2025-07-24T13:26:41.836Z"}
{"client_id":"session_638889748000156830","has_memory":true,"level":"info","message":"Created new session with memory store","session_id":"session_638889748000156830","time":"2025-07-24T13:26:41.836Z"}
{"level":"info","message":"Session registered","session_id":"session_638889748000156830","time":"2025-07-24T13:26:41.836Z","type":"api","user_id":"session_638889748000156830"}
{"autonomy_mode":"agent-default","history_length":0,"level":"info","message":"Starting streaming chat processing","session_id":"session_638889748000156830","time":"2025-07-24T13:26:41.836Z"}
{"level":"info","session":"session_638889748000156830","tools_count":19,"autonomy_mode":"agent-default","time":"2025-07-24T13:26:41-04:00","message":"Starting streaming chat with tools and history"}
{"level":"warning","message":"ResponseWriter does not support flushing, attempting to continue anyway","time":"2025-07-24T13:26:41.836Z"}
{"chunk_type":"text","first_chunk_delay_ms":1236,"level":"info","message":"First chunk being sent - streaming is active","time":"2025-07-24T13:26:43.073Z"}
{"chunk_number":1,"chunk_type":"text","elapsed_ms":1236,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T13:26:43.073Z"}
{"chunk_number":2,"chunk_type":"text","elapsed_ms":1316,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T13:26:43.152Z"}
{"chunk_number":3,"chunk_type":"text","elapsed_ms":1385,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T13:26:43.221Z"}
{"chunk_number":4,"chunk_type":"text","elapsed_ms":1744,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T13:26:43.580Z"}
{"chunk_number":5,"chunk_type":"text","elapsed_ms":1779,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T13:26:43.615Z"}
{"chunk_number":6,"chunk_type":"text","elapsed_ms":1787,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T13:26:43.623Z"}
{"chunk_number":7,"chunk_type":"text","elapsed_ms":1802,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T13:26:43.639Z"}
{"chunk_number":8,"chunk_type":"text","elapsed_ms":1805,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T13:26:43.642Z"}
{"chunk_number":9,"chunk_type":"text","elapsed_ms":1816,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T13:26:43.653Z"}
{"chunk_number":10,"chunk_type":"text","elapsed_ms":1879,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T13:26:43.715Z"}
{"chunk_number":11,"chunk_type":"text","elapsed_ms":1949,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T13:26:43.785Z"}
{"chunk_number":12,"chunk_type":"text","elapsed_ms":2000,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T13:26:43.836Z"}
{"chunk_number":13,"chunk_type":"text","elapsed_ms":2045,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T13:26:43.882Z"}
{"chunk_number":14,"chunk_type":"text","elapsed_ms":2094,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T13:26:43.930Z"}
{"chunk_number":15,"chunk_type":"text","elapsed_ms":2142,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T13:26:43.979Z"}
{"chunk_number":16,"chunk_type":"text","elapsed_ms":2239,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T13:26:44.075Z"}
{"chunk_number":17,"chunk_type":"text","elapsed_ms":2283,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T13:26:44.119Z"}
{"chunk_number":18,"chunk_type":"tool_start","elapsed_ms":2599,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T13:26:44.435Z"}
{"chunk_number":19,"chunk_type":"tool_progress","elapsed_ms":2599,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T13:26:44.435Z"}
{"chunk_number":20,"chunk_type":"tool_progress","elapsed_ms":3097,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T13:26:44.933Z"}
{"chunk_number":21,"chunk_type":"tool_progress","elapsed_ms":3097,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T13:26:44.933Z"}
{"chunk_number":22,"chunk_type":"tool_progress","elapsed_ms":3097,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T13:26:44.933Z"}
{"chunk_number":23,"chunk_type":"tool_progress","elapsed_ms":3097,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T13:26:44.933Z"}
{"chunk_number":24,"chunk_type":"tool_progress","elapsed_ms":3097,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T13:26:44.933Z"}
{"chunk_number":25,"chunk_type":"tool_progress","elapsed_ms":3407,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T13:26:45.243Z"}
{"chunk_number":26,"chunk_type":"tool_progress","elapsed_ms":3407,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T13:26:45.243Z"}
{"chunk_number":27,"chunk_type":"tool_progress","elapsed_ms":3407,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T13:26:45.243Z"}
{"chunk_number":28,"chunk_type":"tool_progress","elapsed_ms":3407,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T13:26:45.243Z"}
{"chunk_number":29,"chunk_type":"tool_progress","elapsed_ms":3407,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T13:26:45.243Z"}
{"chunk_number":30,"chunk_type":"tool_progress","elapsed_ms":3407,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T13:26:45.243Z"}
{"chunk_number":31,"chunk_type":"tool_progress","elapsed_ms":3407,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T13:26:45.243Z"}
{"chunk_number":32,"chunk_type":"tool_progress","elapsed_ms":3622,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T13:26:45.459Z"}
{"chunk_number":33,"chunk_type":"tool_progress","elapsed_ms":3634,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T13:26:45.470Z"}
{"chunk_number":34,"chunk_type":"tool_progress","elapsed_ms":3668,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T13:26:45.504Z"}
{"chunk_number":35,"chunk_type":"tool_progress","elapsed_ms":3675,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T13:26:45.512Z"}
{"chunk_number":36,"chunk_type":"tool_complete","elapsed_ms":3697,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T13:26:45.533Z"}
{"content_length":263,"level":"info","message":"Streaming completed, saved to history","session_id":"session_638889748000156830","time":"2025-07-24T13:26:45.543Z"}
{"chunk_number":37,"chunk_type":"","elapsed_ms":3707,"has_delta":false,"is_done":true,"level":"debug","message":"Sending chunk","time":"2025-07-24T13:26:45.543Z"}
{"avg_chunk_time_ms":100,"duration_ms":3707,"level":"info","message":"Streaming completed","time":"2025-07-24T13:26:45.543Z","total_chunks":37}
{"duration_ms":3707,"level":"info","message":"Request processed successfully","method":"GET","path":"/api/chat/stream","query":"sessionId=session_638889748000156830\u0026content=Please%20make%20DCF%20model%20in%20this%20sheet%2C%20use%20mock%20data\u0026autonomyMode=agent-default\u0026token=dev-token-123","remote_ip":"[::1]","request_id":"27c9b639-9982-4b84-b7da-e20483997dc5","route_pattern":"/api/chat/stream","size":6092,"status":200,"time":"2025-07-24T13:26:45.543Z","user_agent":""}

