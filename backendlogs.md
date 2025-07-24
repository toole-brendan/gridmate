Last login: Thu Jul 24 16:33:13 on ttys043
brendantoole@Mac ~ % cd '/Users/brendantoole/projects2/gridmate/backend' && echo '--- Go Backend Service ---' && LOG_LEVEL=debug go run cmd/api/main.go
--- Go Backend Service ---
{"level":"info","message":"Database connection established","time":"2025-07-24T16:33:15.186Z"}
2025/07/24 16:33:15 Starting migrations from path: ./migrations
2025/07/24 16:33:15 Current migration version: 4, dirty: false
2025/07/24 16:33:15 Database migrated to version 4
{"level":"info","executor_is_nil":false,"time":"2025-07-24T16:33:15-04:00","message":"SetToolExecutor called"}
{"level":"info","message":"Tool executor, context builder, and queued ops registry set in AI service","time":"2025-07-24T16:33:15.447Z"}
{"level":"info","message":"Vector memory indexing service initialized with OpenAI embeddings","time":"2025-07-24T16:33:15.447Z"}
{"level":"info","executor_is_nil":false,"time":"2025-07-24T16:33:15-04:00","message":"SetToolExecutor called"}
{"level":"info","message":"Tool executor transferred to main AI service","time":"2025-07-24T16:33:15.447Z"}
{"level":"info","message":"Embedding provider set on tool executor for memory search","time":"2025-07-24T16:33:15.447Z"}
{"level":"info","message":"Context builder transferred to main AI service","time":"2025-07-24T16:33:15.447Z"}
{"level":"info","message":"Queued operations registry transferred to main AI service","time":"2025-07-24T16:33:15.447Z"}
{"level":"info","message":"Initializing advanced AI components (memory, context analyzer, orchestrator)","time":"2025-07-24T16:33:15.447Z"}
{"level":"info","memory_service":true,"context_analyzer":true,"tool_orchestrator":true,"time":"2025-07-24T16:33:15-04:00","message":"Advanced AI components configured"}
{"level":"info","message":"Advanced AI components successfully initialized and connected","time":"2025-07-24T16:33:15.447Z"}
{"level":"info","message":"Starting server on port 8080","time":"2025-07-24T16:33:15.447Z"}
{"autonomy_mode":"agent-default","content":"Please make DCF model in this sheet, use mock data","level":"info","message":"Starting streaming chat request","session_id":"session_638889860087792110","time":"2025-07-24T16:33:33.570Z"}
{"client_id":"session_638889860087792110","has_memory":true,"level":"info","message":"Created new session with memory store","session_id":"session_638889860087792110","time":"2025-07-24T16:33:33.570Z"}
{"level":"info","message":"Session registered","session_id":"session_638889860087792110","time":"2025-07-24T16:33:33.570Z","type":"api","user_id":"session_638889860087792110"}
{"autonomy_mode":"agent-default","history_length":0,"level":"info","message":"Starting streaming chat processing","session_id":"session_638889860087792110","time":"2025-07-24T16:33:33.570Z"}
{"level":"info","session":"session_638889860087792110","tools_count":19,"autonomy_mode":"agent-default","time":"2025-07-24T16:33:33-04:00","message":"Starting streaming chat with tools and history"}
{"level":"warning","message":"ResponseWriter does not support flushing, attempting to continue anyway","time":"2025-07-24T16:33:33.570Z"}
{"chunk_type":"text","first_chunk_delay_ms":5069,"level":"info","message":"First chunk being sent - streaming is active","time":"2025-07-24T16:33:38.639Z"}
{"chunk_number":1,"chunk_type":"text","elapsed_ms":5069,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T16:33:38.639Z"}
{"chunk_number":2,"chunk_type":"text","elapsed_ms":5328,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T16:33:38.898Z"}
{"chunk_number":3,"chunk_type":"text","elapsed_ms":5431,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T16:33:39.002Z"}
{"chunk_number":4,"chunk_type":"text","elapsed_ms":5571,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T16:33:39.142Z"}
{"chunk_number":5,"chunk_type":"text","elapsed_ms":5811,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T16:33:39.382Z"}
{"chunk_number":6,"chunk_type":"text","elapsed_ms":6080,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T16:33:39.650Z"}
{"chunk_number":7,"chunk_type":"text","elapsed_ms":6170,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T16:33:39.741Z"}
{"chunk_number":8,"chunk_type":"text","elapsed_ms":6329,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T16:33:39.899Z"}
{"chunk_number":9,"chunk_type":"tool_start","elapsed_ms":6718,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T16:33:40.288Z"}
{"chunk_number":10,"chunk_type":"tool_progress","elapsed_ms":6718,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T16:33:40.288Z"}
{"chunk_number":11,"chunk_type":"tool_progress","elapsed_ms":7208,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T16:33:40.778Z"}
{"chunk_number":12,"chunk_type":"tool_progress","elapsed_ms":7208,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T16:33:40.778Z"}
{"chunk_number":13,"chunk_type":"tool_progress","elapsed_ms":7208,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T16:33:40.778Z"}
{"chunk_number":14,"chunk_type":"tool_progress","elapsed_ms":7436,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T16:33:41.007Z"}
{"chunk_number":15,"chunk_type":"tool_progress","elapsed_ms":7436,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T16:33:41.007Z"}
{"chunk_number":16,"chunk_type":"tool_progress","elapsed_ms":7436,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T16:33:41.007Z"}
{"chunk_number":17,"chunk_type":"tool_progress","elapsed_ms":7437,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T16:33:41.007Z"}
{"chunk_number":18,"chunk_type":"tool_progress","elapsed_ms":7437,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T16:33:41.007Z"}
{"chunk_number":19,"chunk_type":"tool_progress","elapsed_ms":7568,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T16:33:41.139Z"}
{"chunk_number":20,"chunk_type":"tool_progress","elapsed_ms":7568,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T16:33:41.139Z"}
{"chunk_number":21,"chunk_type":"tool_progress","elapsed_ms":7569,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T16:33:41.139Z"}
{"chunk_number":22,"chunk_type":"tool_progress","elapsed_ms":7569,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T16:33:41.139Z"}
{"chunk_number":23,"chunk_type":"tool_progress","elapsed_ms":7569,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T16:33:41.139Z"}
{"chunk_number":24,"chunk_type":"tool_progress","elapsed_ms":7575,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T16:33:41.145Z"}
{"chunk_number":25,"chunk_type":"tool_progress","elapsed_ms":7575,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T16:33:41.145Z"}
{"chunk_number":26,"chunk_type":"tool_progress","elapsed_ms":7575,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T16:33:41.145Z"}
{"chunk_number":27,"chunk_type":"tool_progress","elapsed_ms":7575,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T16:33:41.145Z"}
{"chunk_number":28,"chunk_type":"tool_progress","elapsed_ms":7575,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T16:33:41.145Z"}
{"chunk_number":29,"chunk_type":"tool_progress","elapsed_ms":7575,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T16:33:41.145Z"}
{"chunk_number":30,"chunk_type":"tool_progress","elapsed_ms":7579,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T16:33:41.149Z"}
{"chunk_number":31,"chunk_type":"tool_progress","elapsed_ms":7579,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T16:33:41.149Z"}
{"content_length":239,"level":"info","message":"Streaming completed","session_id":"session_638889860087792110","time":"2025-07-24T16:33:41.160Z","tool_calls_count":1}
{"level":"info","message":"Executing tool calls from streaming response","time":"2025-07-24T16:33:41.160Z"}
{"level":"info","session_id":"session_638889860087792110","total_tools":1,"tool_names":["organize_financial_model"],"autonomy_mode":"agent-default","time":"2025-07-24T16:33:41-04:00","message":"Processing tool calls"}
{"level":"info","session_id":"session_638889860087792110","total_tools":1,"batch_count":1,"time":"2025-07-24T16:33:41-04:00","message":"Processing tool calls with batch detection"}
{"level":"info","session_id":"session_638889860087792110","batch_index":0,"tools_in_batch":1,"batch_tools":["organize_financial_model"],"time":"2025-07-24T16:33:41-04:00","message":"Processing batch"}
{"level":"debug","tool_name":"organize_financial_model","tool_id":"toolu_01RFXQvTJcWva33SohiXCewG","input":{},"time":"2025-07-24T16:33:41-04:00","message":"Executing individual tool in batch"}
{"level":"info","tool":"organize_financial_model","session":"session_638889860087792110","tool_id":"toolu_01RFXQvTJcWva33SohiXCewG","input":{},"autonomy_mode":"agent-default","time":"2025-07-24T16:33:41-04:00","message":"Executing Excel tool"}
{"chunk_number":32,"chunk_type":"tool_complete","elapsed_ms":7589,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T16:33:41.160Z"}
{"chunk_number":33,"chunk_type":"","elapsed_ms":7589,"has_delta":false,"is_done":true,"level":"debug","message":"Sending chunk","time":"2025-07-24T16:33:41.160Z"}
{"level":"info","session":"session_638889860087792110","time":"2025-07-24T16:33:41-04:00","message":"Starting financial model organization"}
{"level":"debug","range":"A1:Z100","time":"2025-07-24T16:33:41-04:00","message":"Reading current model structure"}
{"avg_chunk_time_ms":229,"duration_ms":7589,"level":"info","message":"Streaming completed","time":"2025-07-24T16:33:41.160Z","total_chunks":33}
{"duration_ms":7590,"level":"info","message":"Request processed successfully","method":"GET","path":"/api/chat/stream","query":"sessionId=session_638889860087792110\u0026content=Please%20make%20DCF%20model%20in%20this%20sheet%2C%20use%20mock%20data\u0026autonomyMode=agent-default\u0026token=dev-token-123","remote_ip":"[::1]","request_id":"c0cd9e91-dc5f-427e-a8fd-8fa674d73dbf","route_pattern":"/api/chat/stream","size":6190,"status":200,"time":"2025-07-24T16:33:41.160Z","user_agent":""}
{"level":"debug","session_id":"session_638889860087792110","initial_client_id":"session_638889860087792110","has_client_id_resolver":true,"time":"2025-07-24T16:33:41-04:00","message":"Starting client ID resolution"}
{"level":"debug","message":"Client ID resolver called","session_id":"session_638889860087792110","time":"2025-07-24T16:33:41.161Z","total_sessions":1}
{"available_session_id":"session_638889860087792110","client_id":"session_638889860087792110","level":"debug","message":"Available session in resolver","time":"2025-07-24T16:33:41.161Z","user_id":""}
{"client_id":"session_638889860087792110","level":"info","message":"Client ID resolver found session","session_id":"session_638889860087792110","time":"2025-07-24T16:33:41.161Z","user_id":""}
{"level":"debug","session_id":"session_638889860087792110","resolved_client_id":"session_638889860087792110","time":"2025-07-24T16:33:41-04:00","message":"Client ID resolved via resolver function"}
{"level":"info","session_id":"session_638889860087792110","final_client_id":"session_638889860087792110","request_id":"5d222e66-d99d-45c4-8912-9c3a1a7e0ccc","session_equals_client":true,"time":"2025-07-24T16:33:41-04:00","message":"Final client ID resolution for tool request"}
{"level":"info","session_id":"session_638889860087792110","client_id":"session_638889860087792110","request_id":"5d222e66-d99d-45c4-8912-9c3a1a7e0ccc","time":"2025-07-24T16:33:41-04:00","message":"Registering tool handler for response"}
{"level":"info","session_id":"session_638889860087792110","request_id":"5d222e66-d99d-45c4-8912-9c3a1a7e0ccc","time":"2025-07-24T16:33:41-04:00","message":"Sending tool request via SignalR bridge"}
{"level":"debug","session_id":"session_638889860087792110","client_id":"session_638889860087792110","request_id":"5d222e66-d99d-45c4-8912-9c3a1a7e0ccc","time":"2025-07-24T16:33:41-04:00","message":"Unregistering tool handler after final response"}
{"level":"info","session_id":"session_638889860087792110","total_results":1,"successful":0,"time":"2025-07-24T16:33:41-04:00","message":"Tool calls processing completed"}
{"all_queued":false,"level":"info","message":"Tool calls from streaming processed","session_id":"session_638889860087792110","time":"2025-07-24T16:33:41.171Z","tool_count":1}
{"acknowledged":false,"has_details":false,"has_error":false,"has_metadata":false,"level":"info","message":"Received tool response from SignalR","queued":true,"request_id":"5d222e66-d99d-45c4-8912-9c3a1a7e0ccc","time":"2025-07-24T16:33:41.535Z"}
{"level":"warn","component":"excel_bridge","session_id":"session_638889860087792110","request_id":"5d222e66-d99d-45c4-8912-9c3a1a7e0ccc","time":"2025-07-24T16:33:41-04:00","message":"No handler found for tool response - queuing for later delivery"}
{"level":"info","message":"Tool response routed to handler","request_id":"5d222e66-d99d-45c4-8912-9c3a1a7e0ccc","session_id":"session_638889860087792110","time":"2025-07-24T16:33:41.535Z"}
{"duration_ms":0,"level":"info","message":"Request processed successfully","method":"POST","path":"/api/tool-response","query":"","remote_ip":"[::1]","request_body":{"error":"","errorDetails":null,"metadata":{},"queued":true,"requestId":"5d222e66-d99d-45c4-8912-9c3a1a7e0ccc","result":{"message":"read_range request received and processing","status":"acknowledged"},"sessionId":"session_638889860087792110","timestamp":"2025-07-24T20:33:41.531712Z"},"request_id":"24fe15c6-5ffb-4a9c-ae11-834a79456f9a","response_body":{"message":"Tool response received","success":true},"route_pattern":"/api/tool-response","size":52,"status":200,"time":"2025-07-24T16:33:41.535Z","user_agent":""}
{"acknowledged":false,"has_details":false,"has_error":false,"has_metadata":false,"level":"info","message":"Received tool response from SignalR","queued":false,"request_id":"5d222e66-d99d-45c4-8912-9c3a1a7e0ccc","time":"2025-07-24T16:33:41.600Z"}
{"level":"warn","component":"excel_bridge","session_id":"session_638889860087792110","request_id":"5d222e66-d99d-45c4-8912-9c3a1a7e0ccc","time":"2025-07-24T16:33:41-04:00","message":"No handler found for tool response - queuing for later delivery"}
{"level":"debug","message":"Operation not in registry, skipping status update","request_id":"5d222e66-d99d-45c4-8912-9c3a1a7e0ccc","time":"2025-07-24T16:33:41.600Z","tool_id":"5d222e66-d99d-45c4-8912-9c3a1a7e0ccc"}
{"level":"info","message":"Tool response routed to handler","request_id":"5d222e66-d99d-45c4-8912-9c3a1a7e0ccc","session_id":"session_638889860087792110","time":"2025-07-24T16:33:41.600Z"}
{"duration_ms":0,"level":"info","message":"Request processed successfully","method":"POST","path":"/api/tool-response","query":"","remote_ip":"[::1]","request_body":{"error":"","errorDetails":null,"metadata":{},"queued":false,"requestId":"5d222e66-d99d-45c4-8912-9c3a1a7e0ccc","result":{"address":"Sheet1!A1:Z100","colCount":0,"formulas":[],"rowCount":0,"values":[]},"sessionId":"session_638889860087792110","timestamp":"2025-07-24T20:33:41.599099Z"},"request_id":"68b86862-8c0f-483f-a40a-8112d5e2e430","response_body":{"message":"Tool response received","success":true},"route_pattern":"/api/tool-response","size":52,"status":200,"time":"2025-07-24T16:33:41.600Z","user_agent":""}

