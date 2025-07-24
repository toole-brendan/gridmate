Last login: Thu Jul 24 12:10:00 on ttys018
cd '/Users/brendantoole/projects2/gridmate/backend' && echo '--- Go Backend Service ---' && LOG_LEVEL=debug go run cmd/api/main.go
brendantoole@Mac ~ % cd '/Users/brendantoole/projects2/gridmate/backend' && echo '--- Go Backend Service ---' && LOG_LEVEL=debug go run cmd/api/main.go
--- Go Backend Service ---
{"level":"info","message":"Database connection established","time":"2025-07-24T12:10:01.846Z"}
2025/07/24 12:10:01 Starting migrations from path: ./migrations
2025/07/24 12:10:02 Current migration version: 4, dirty: false
2025/07/24 12:10:02 Database migrated to version 4
{"level":"info","executor_is_nil":false,"time":"2025-07-24T12:10:02-04:00","message":"SetToolExecutor called"}
{"level":"info","message":"Tool executor, context builder, and queued ops registry set in AI service","time":"2025-07-24T12:10:02.114Z"}
{"level":"info","message":"Vector memory indexing service initialized with OpenAI embeddings","time":"2025-07-24T12:10:02.114Z"}
{"level":"info","executor_is_nil":false,"time":"2025-07-24T12:10:02-04:00","message":"SetToolExecutor called"}
{"level":"info","message":"Tool executor transferred to main AI service","time":"2025-07-24T12:10:02.114Z"}
{"level":"info","message":"Embedding provider set on tool executor for memory search","time":"2025-07-24T12:10:02.114Z"}
{"level":"info","message":"Context builder transferred to main AI service","time":"2025-07-24T12:10:02.114Z"}
{"level":"info","message":"Queued operations registry transferred to main AI service","time":"2025-07-24T12:10:02.114Z"}
{"level":"info","message":"Initializing advanced AI components (memory, context analyzer, orchestrator)","time":"2025-07-24T12:10:02.114Z"}
{"level":"info","memory_service":true,"context_analyzer":true,"tool_orchestrator":true,"time":"2025-07-24T12:10:02-04:00","message":"Advanced AI components configured"}
{"level":"info","message":"Advanced AI components successfully initialized and connected","time":"2025-07-24T12:10:02.114Z"}
{"level":"info","message":"Starting server on port 8080","time":"2025-07-24T12:10:02.115Z"}
{"autonomy_mode":"agent-default","content":"Please make DCF model in this sheet, use mock data","level":"info","message":"Starting streaming chat request","session_id":"session_638889702454265550","time":"2025-07-24T12:10:51.297Z"}
{"client_id":"session_638889702454265550","has_memory":true,"level":"info","message":"Created new session with memory store","session_id":"session_638889702454265550","time":"2025-07-24T12:10:51.297Z"}
{"level":"info","message":"Session registered","session_id":"session_638889702454265550","time":"2025-07-24T12:10:51.297Z","type":"api","user_id":"session_638889702454265550"}
{"autonomy_mode":"agent-default","history_length":0,"level":"info","message":"Starting streaming chat processing","session_id":"session_638889702454265550","time":"2025-07-24T12:10:51.297Z"}
{"level":"info","session":"session_638889702454265550","tools_count":19,"autonomy_mode":"agent-default","time":"2025-07-24T12:10:51-04:00","message":"Starting streaming chat with tools and history"}
{"level":"warning","message":"ResponseWriter does not support flushing, attempting to continue anyway","time":"2025-07-24T12:10:51.297Z"}
{"chunk_number":1,"chunk_type":"text","elapsed_ms":1235,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:10:52.533Z"}
{"chunk_number":2,"chunk_type":"text","elapsed_ms":1289,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:10:52.587Z"}
{"chunk_number":3,"chunk_type":"text","elapsed_ms":1380,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:10:52.678Z"}
{"chunk_number":4,"chunk_type":"text","elapsed_ms":1434,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:10:52.732Z"}
{"chunk_number":5,"chunk_type":"text","elapsed_ms":1552,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:10:52.850Z"}
{"chunk_number":6,"chunk_type":"text","elapsed_ms":1597,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:10:52.895Z"}
{"chunk_number":7,"chunk_type":"text","elapsed_ms":1689,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:10:52.987Z"}
{"chunk_number":8,"chunk_type":"text","elapsed_ms":1741,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:10:53.039Z"}
{"chunk_number":9,"chunk_type":"text","elapsed_ms":1785,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:10:53.083Z"}
{"chunk_number":10,"chunk_type":"text","elapsed_ms":1838,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:10:53.136Z"}
{"chunk_number":11,"chunk_type":"text","elapsed_ms":1928,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:10:53.226Z"}
{"chunk_number":12,"chunk_type":"text","elapsed_ms":1978,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:10:53.276Z"}
{"chunk_number":13,"chunk_type":"text","elapsed_ms":2069,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:10:53.367Z"}
{"chunk_number":14,"chunk_type":"text","elapsed_ms":2117,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:10:53.415Z"}
{"chunk_number":15,"chunk_type":"text","elapsed_ms":2171,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:10:53.468Z"}
{"chunk_number":16,"chunk_type":"text","elapsed_ms":2213,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:10:53.511Z"}
{"chunk_number":17,"chunk_type":"text","elapsed_ms":2259,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:10:53.557Z"}
{"chunk_number":18,"chunk_type":"text","elapsed_ms":2309,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:10:53.607Z"}
{"chunk_number":19,"chunk_type":"text","elapsed_ms":2355,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:10:53.653Z"}
{"chunk_number":20,"chunk_type":"text","elapsed_ms":2404,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:10:53.702Z"}
{"chunk_number":21,"chunk_type":"text","elapsed_ms":2485,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:10:53.783Z"}
{"chunk_number":22,"chunk_type":"text","elapsed_ms":2497,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:10:53.794Z"}
{"chunk_number":23,"chunk_type":"tool_start","elapsed_ms":2692,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:10:53.990Z"}
{"chunk_number":24,"chunk_type":"tool_progress","elapsed_ms":2692,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:10:53.990Z"}
{"chunk_number":25,"chunk_type":"tool_progress","elapsed_ms":3121,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:10:54.419Z"}
{"chunk_number":26,"chunk_type":"tool_progress","elapsed_ms":3121,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:10:54.419Z"}
{"chunk_number":27,"chunk_type":"tool_progress","elapsed_ms":3122,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:10:54.420Z"}
{"chunk_number":28,"chunk_type":"tool_progress","elapsed_ms":3122,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:10:54.420Z"}
{"chunk_number":29,"chunk_type":"tool_progress","elapsed_ms":3361,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:10:54.659Z"}
{"chunk_number":30,"chunk_type":"tool_progress","elapsed_ms":3361,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:10:54.659Z"}
{"chunk_number":31,"chunk_type":"tool_progress","elapsed_ms":3361,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:10:54.659Z"}
{"chunk_number":32,"chunk_type":"tool_progress","elapsed_ms":3361,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:10:54.659Z"}
{"chunk_number":33,"chunk_type":"tool_progress","elapsed_ms":3361,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:10:54.659Z"}
{"chunk_number":34,"chunk_type":"tool_progress","elapsed_ms":3361,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:10:54.659Z"}
{"chunk_number":35,"chunk_type":"tool_progress","elapsed_ms":3633,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:10:54.931Z"}
{"chunk_number":36,"chunk_type":"tool_progress","elapsed_ms":3639,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:10:54.937Z"}
{"chunk_number":37,"chunk_type":"tool_progress","elapsed_ms":3639,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:10:54.937Z"}
{"chunk_number":38,"chunk_type":"tool_progress","elapsed_ms":3639,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:10:54.937Z"}
{"chunk_number":39,"chunk_type":"tool_complete","elapsed_ms":3640,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:10:54.938Z"}
{"content_length":293,"level":"info","message":"Streaming completed, saved to history","session_id":"session_638889702454265550","time":"2025-07-24T12:10:54.941Z"}
{"chunk_number":40,"chunk_type":"","elapsed_ms":3643,"has_delta":false,"is_done":true,"level":"debug","message":"Sending chunk","time":"2025-07-24T12:10:54.941Z"}
{"duration_ms":3643,"level":"info","message":"Streaming completed successfully","time":"2025-07-24T12:10:54.941Z","total_chunks":40}
{"duration_ms":3644,"level":"info","message":"Request processed successfully","method":"GET","path":"/api/chat/stream","query":"sessionId=session_638889702454265550\u0026content=Please%20make%20DCF%20model%20in%20this%20sheet%2C%20use%20mock%20data\u0026autonomyMode=agent-default\u0026token=dev-token-123","remote_ip":"[::1]","request_id":"861597d2-80ed-42b0-aa50-daae26e30800","route_pattern":"/api/chat/stream","size":6228,"status":200,"time":"2025-07-24T12:10:54.941Z","user_agent":""}

