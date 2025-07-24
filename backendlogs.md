Last login: Thu Jul 24 14:12:06 on ttys038
cd '/Users/brendantoole/projects2/gridmate/backend' && echo '--- Go Backend Service ---' && LOG_LEVEL=debug go run cmd/api/main.go
brendantoole@Mac ~ % cd '/Users/brendantoole/projects2/gridmate/backend' && echo '--- Go Backend Service ---' && LOG_LEVEL=debug go run cmd/api/main.go
--- Go Backend Service ---
{"level":"info","message":"Database connection established","time":"2025-07-24T14:12:07.186Z"}
2025/07/24 14:12:07 Starting migrations from path: ./migrations
2025/07/24 14:12:07 Current migration version: 4, dirty: false
2025/07/24 14:12:07 Database migrated to version 4
{"level":"info","executor_is_nil":false,"time":"2025-07-24T14:12:07-04:00","message":"SetToolExecutor called"}
{"level":"info","message":"Tool executor, context builder, and queued ops registry set in AI service","time":"2025-07-24T14:12:07.456Z"}
{"level":"info","message":"Vector memory indexing service initialized with OpenAI embeddings","time":"2025-07-24T14:12:07.456Z"}
{"level":"info","executor_is_nil":false,"time":"2025-07-24T14:12:07-04:00","message":"SetToolExecutor called"}
{"level":"info","message":"Tool executor transferred to main AI service","time":"2025-07-24T14:12:07.456Z"}
{"level":"info","message":"Embedding provider set on tool executor for memory search","time":"2025-07-24T14:12:07.456Z"}
{"level":"info","message":"Context builder transferred to main AI service","time":"2025-07-24T14:12:07.456Z"}
{"level":"info","message":"Queued operations registry transferred to main AI service","time":"2025-07-24T14:12:07.456Z"}
{"level":"info","message":"Initializing advanced AI components (memory, context analyzer, orchestrator)","time":"2025-07-24T14:12:07.456Z"}
{"level":"info","memory_service":true,"context_analyzer":true,"tool_orchestrator":true,"time":"2025-07-24T14:12:07-04:00","message":"Advanced AI components configured"}
{"level":"info","message":"Advanced AI components successfully initialized and connected","time":"2025-07-24T14:12:07.456Z"}
{"level":"info","message":"Starting server on port 8080","time":"2025-07-24T14:12:07.456Z"}
{"autonomy_mode":"agent-default","content":"Please make DCF model in this sheet, use mock data","level":"info","message":"Starting streaming chat request","session_id":"session_638889775397273050","time":"2025-07-24T14:12:38.154Z"}
{"client_id":"session_638889775397273050","has_memory":true,"level":"info","message":"Created new session with memory store","session_id":"session_638889775397273050","time":"2025-07-24T14:12:38.154Z"}
{"level":"info","message":"Session registered","session_id":"session_638889775397273050","time":"2025-07-24T14:12:38.154Z","type":"api","user_id":"session_638889775397273050"}
{"autonomy_mode":"agent-default","history_length":0,"level":"info","message":"Starting streaming chat processing","session_id":"session_638889775397273050","time":"2025-07-24T14:12:38.154Z"}
{"level":"info","session":"session_638889775397273050","tools_count":19,"autonomy_mode":"agent-default","time":"2025-07-24T14:12:38-04:00","message":"Starting streaming chat with tools and history"}
{"level":"warning","message":"ResponseWriter does not support flushing, attempting to continue anyway","time":"2025-07-24T14:12:38.154Z"}
{"chunk_type":"text","first_chunk_delay_ms":1275,"level":"info","message":"First chunk being sent - streaming is active","time":"2025-07-24T14:12:39.430Z"}
{"chunk_number":1,"chunk_type":"text","elapsed_ms":1275,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T14:12:39.430Z"}
{"chunk_number":2,"chunk_type":"text","elapsed_ms":1320,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T14:12:39.474Z"}
{"chunk_number":3,"chunk_type":"text","elapsed_ms":1383,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T14:12:39.537Z"}
{"chunk_number":4,"chunk_type":"text","elapsed_ms":1427,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T14:12:39.581Z"}
{"chunk_number":5,"chunk_type":"text","elapsed_ms":1479,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T14:12:39.634Z"}
{"chunk_number":6,"chunk_type":"text","elapsed_ms":1514,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T14:12:39.669Z"}
{"chunk_number":7,"chunk_type":"text","elapsed_ms":1574,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T14:12:39.729Z"}
{"chunk_number":8,"chunk_type":"text","elapsed_ms":1632,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T14:12:39.786Z"}
{"chunk_number":9,"chunk_type":"text","elapsed_ms":1679,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T14:12:39.834Z"}
{"chunk_number":10,"chunk_type":"text","elapsed_ms":1706,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T14:12:39.860Z"}
{"chunk_number":11,"chunk_type":"text","elapsed_ms":1771,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T14:12:39.926Z"}
{"chunk_number":12,"chunk_type":"text","elapsed_ms":1821,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T14:12:39.976Z"}
{"chunk_number":13,"chunk_type":"text","elapsed_ms":1868,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T14:12:40.023Z"}
{"chunk_number":14,"chunk_type":"text","elapsed_ms":1917,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T14:12:40.072Z"}
{"chunk_number":15,"chunk_type":"text","elapsed_ms":1961,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T14:12:40.116Z"}
{"chunk_number":16,"chunk_type":"text","elapsed_ms":2009,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T14:12:40.164Z"}
{"chunk_number":17,"chunk_type":"text","elapsed_ms":2056,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T14:12:40.210Z"}
{"chunk_number":18,"chunk_type":"text","elapsed_ms":2154,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T14:12:40.309Z"}
{"chunk_number":19,"chunk_type":"text","elapsed_ms":2199,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T14:12:40.353Z"}
{"chunk_number":20,"chunk_type":"text","elapsed_ms":2246,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T14:12:40.400Z"}
{"chunk_number":21,"chunk_type":"text","elapsed_ms":2295,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T14:12:40.450Z"}
{"chunk_number":22,"chunk_type":"text","elapsed_ms":2346,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T14:12:40.500Z"}
{"chunk_number":23,"chunk_type":"text","elapsed_ms":2395,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T14:12:40.550Z"}
{"chunk_number":24,"chunk_type":"tool_start","elapsed_ms":2772,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T14:12:40.926Z"}
{"chunk_number":25,"chunk_type":"tool_progress","elapsed_ms":2772,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T14:12:40.926Z"}
{"chunk_number":26,"chunk_type":"tool_progress","elapsed_ms":3323,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T14:12:41.478Z"}
{"chunk_number":27,"chunk_type":"tool_progress","elapsed_ms":3323,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T14:12:41.478Z"}
{"chunk_number":28,"chunk_type":"tool_progress","elapsed_ms":3323,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T14:12:41.478Z"}
{"chunk_number":29,"chunk_type":"tool_progress","elapsed_ms":3323,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T14:12:41.478Z"}
{"chunk_number":30,"chunk_type":"tool_progress","elapsed_ms":3498,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T14:12:41.653Z"}
{"chunk_number":31,"chunk_type":"tool_progress","elapsed_ms":3499,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T14:12:41.654Z"}
{"chunk_number":32,"chunk_type":"tool_progress","elapsed_ms":3499,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T14:12:41.654Z"}
{"chunk_number":33,"chunk_type":"tool_progress","elapsed_ms":3501,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T14:12:41.655Z"}
{"chunk_number":34,"chunk_type":"tool_complete","elapsed_ms":3502,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T14:12:41.657Z"}
{"content_length":272,"level":"info","message":"Streaming completed, saved to history","session_id":"session_638889775397273050","time":"2025-07-24T14:12:41.658Z"}
{"chunk_number":35,"chunk_type":"","elapsed_ms":3504,"has_delta":false,"is_done":true,"level":"debug","message":"Sending chunk","time":"2025-07-24T14:12:41.658Z"}
{"avg_chunk_time_ms":100,"duration_ms":3504,"level":"info","message":"Streaming completed","time":"2025-07-24T14:12:41.658Z","total_chunks":35}
{"duration_ms":3504,"level":"info","message":"Request processed successfully","method":"GET","path":"/api/chat/stream","query":"sessionId=session_638889775397273050\u0026content=Please%20make%20DCF%20model%20in%20this%20sheet%2C%20use%20mock%20data\u0026autonomyMode=agent-default\u0026token=dev-token-123","remote_ip":"[::1]","request_id":"978db2ee-a7df-4d08-88cd-386ec3a947fe","route_pattern":"/api/chat/stream","size":5059,"status":200,"time":"2025-07-24T14:12:41.658Z","user_agent":""}

