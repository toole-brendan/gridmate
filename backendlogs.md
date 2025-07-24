Last login: Thu Jul 24 17:27:02 on ttys049
cd '/Users/brendantoole/projects2/gridmate/backend' && echo '--- Go Backend Service ---' && LOG_LEVEL=debug go run cmd/api/main.go
brendantoole@Mac ~ % cd '/Users/brendantoole/projects2/gridmate/backend' && echo '--- Go Backend Service ---' && LOG_LEVEL=debug go run cmd/api/main.go
--- Go Backend Service ---
{"level":"info","message":"Database connection established","time":"2025-07-24T17:27:04.878Z"}
2025/07/24 17:27:04 Starting migrations from path: ./migrations
2025/07/24 17:27:05 Current migration version: 4, dirty: false
2025/07/24 17:27:05 Database migrated to version 4
{"level":"info","executor_is_nil":false,"time":"2025-07-24T17:27:05-04:00","message":"SetToolExecutor called"}
{"level":"info","message":"Tool executor, context builder, and queued ops registry set in AI service","time":"2025-07-24T17:27:05.118Z"}
{"level":"info","message":"Vector memory indexing service initialized with OpenAI embeddings","time":"2025-07-24T17:27:05.118Z"}
{"level":"info","executor_is_nil":false,"time":"2025-07-24T17:27:05-04:00","message":"SetToolExecutor called"}
{"level":"info","message":"Tool executor transferred to main AI service","time":"2025-07-24T17:27:05.118Z"}
{"level":"info","message":"Embedding provider set on tool executor for memory search","time":"2025-07-24T17:27:05.118Z"}
{"level":"info","message":"Context builder transferred to main AI service","time":"2025-07-24T17:27:05.118Z"}
{"level":"info","message":"Queued operations registry transferred to main AI service","time":"2025-07-24T17:27:05.118Z"}
{"level":"info","message":"Initializing advanced AI components (memory, context analyzer, orchestrator)","time":"2025-07-24T17:27:05.118Z"}
{"level":"info","memory_service":true,"context_analyzer":true,"tool_orchestrator":true,"time":"2025-07-24T17:27:05-04:00","message":"Advanced AI components configured"}
{"level":"info","message":"Advanced AI components successfully initialized and connected","time":"2025-07-24T17:27:05.118Z"}
{"level":"info","message":"Starting server on port 8080","time":"2025-07-24T17:27:05.119Z"}
{"autonomy_mode":"agent-default","content":"Please make DCF model in this sheet, use mock data","level":"info","message":"Starting streaming chat request","session_id":"session_638889892307001200","time":"2025-07-24T17:28:11.721Z"}
{"client_id":"session_638889892307001200","has_memory":true,"level":"info","message":"Created new session with memory store","session_id":"session_638889892307001200","time":"2025-07-24T17:28:11.722Z"}
{"level":"info","message":"Session registered","session_id":"session_638889892307001200","time":"2025-07-24T17:28:11.722Z","type":"api","user_id":"session_638889892307001200"}
{"autonomy_mode":"agent-default","history_length":0,"level":"info","message":"Starting streaming chat processing","session_id":"session_638889892307001200","time":"2025-07-24T17:28:11.722Z"}
{"level":"warning","message":"ResponseWriter does not support flushing, attempting to continue anyway","time":"2025-07-24T17:28:11.722Z"}
{"level":"info","session":"session_638889892307001200","tools_count":19,"autonomy_mode":"agent-default","iteration":0,"time":"2025-07-24T17:28:11-04:00","message":"Starting streaming iteration with tools"}
{"chunk_type":"text","first_chunk_delay_ms":4157,"level":"info","message":"First chunk being sent - streaming is active","time":"2025-07-24T17:28:15.879Z"}
{"chunk_number":1,"chunk_type":"text","elapsed_ms":4157,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:28:15.879Z"}
{"chunk_number":2,"chunk_type":"text","elapsed_ms":4359,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:28:16.081Z"}
{"chunk_number":3,"chunk_type":"text","elapsed_ms":4390,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:28:16.112Z"}
{"chunk_number":4,"chunk_type":"text","elapsed_ms":4440,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:28:16.162Z"}
{"chunk_number":5,"chunk_type":"text","elapsed_ms":4575,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:28:16.298Z"}
{"chunk_number":6,"chunk_type":"text","elapsed_ms":4623,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:28:16.345Z"}
{"chunk_number":7,"chunk_type":"text","elapsed_ms":4724,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:28:16.446Z"}
{"chunk_number":8,"chunk_type":"text","elapsed_ms":4783,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:28:16.505Z"}
{"chunk_number":9,"chunk_type":"text","elapsed_ms":4974,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:28:16.696Z"}
{"chunk_number":10,"chunk_type":"text","elapsed_ms":4974,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:28:16.696Z"}
{"chunk_number":11,"chunk_type":"text","elapsed_ms":5007,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:28:16.729Z"}
{"chunk_number":12,"chunk_type":"text","elapsed_ms":5113,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:28:16.836Z"}
{"chunk_number":13,"chunk_type":"tool_start","elapsed_ms":5298,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:28:17.020Z"}
{"chunk_number":14,"chunk_type":"tool_progress","elapsed_ms":5298,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:28:17.020Z"}
{"chunk_number":15,"chunk_type":"tool_progress","elapsed_ms":5791,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:28:17.514Z"}
{"chunk_number":16,"chunk_type":"tool_progress","elapsed_ms":5791,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:28:17.514Z"}
{"chunk_number":17,"chunk_type":"tool_progress","elapsed_ms":5791,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:28:17.514Z"}
{"chunk_number":18,"chunk_type":"tool_progress","elapsed_ms":5791,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:28:17.514Z"}
{"chunk_number":19,"chunk_type":"tool_progress","elapsed_ms":6082,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:28:17.804Z"}
{"chunk_number":20,"chunk_type":"tool_progress","elapsed_ms":6083,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:28:17.805Z"}
{"chunk_number":21,"chunk_type":"tool_progress","elapsed_ms":6083,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:28:17.805Z"}
{"chunk_number":22,"chunk_type":"tool_progress","elapsed_ms":6083,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:28:17.805Z"}
{"chunk_number":23,"chunk_type":"tool_progress","elapsed_ms":6083,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:28:17.805Z"}
{"chunk_number":24,"chunk_type":"tool_progress","elapsed_ms":6083,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:28:17.805Z"}
{"chunk_number":25,"chunk_type":"tool_progress","elapsed_ms":6083,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:28:17.805Z"}
{"chunk_number":26,"chunk_type":"tool_progress","elapsed_ms":6284,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:28:18.006Z"}
{"chunk_number":27,"chunk_type":"tool_progress","elapsed_ms":6284,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:28:18.006Z"}
{"chunk_number":28,"chunk_type":"tool_progress","elapsed_ms":6285,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:28:18.007Z"}
{"chunk_number":29,"chunk_type":"tool_progress","elapsed_ms":6285,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:28:18.007Z"}
{"chunk_number":30,"chunk_type":"tool_complete","elapsed_ms":6285,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:28:18.007Z"}
{"level":"info","message":"Executing tool during stream","time":"2025-07-24T17:28:18.007Z","tool_id":"toolu_01FuQRU2GNmUuWkdTibJGiXj","tool_name":"organize_financial_model"}
{"level":"info","session_id":"session_638889892307001200","total_tools":1,"tool_names":["organize_financial_model"],"autonomy_mode":"agent-default","time":"2025-07-24T17:28:18-04:00","message":"Processing tool calls"}
{"level":"info","session_id":"session_638889892307001200","total_tools":1,"batch_count":1,"time":"2025-07-24T17:28:18-04:00","message":"Processing tool calls with batch detection"}
{"level":"info","session_id":"session_638889892307001200","batch_index":0,"tools_in_batch":1,"batch_tools":["organize_financial_model"],"time":"2025-07-24T17:28:18-04:00","message":"Processing batch"}
{"level":"debug","tool_name":"organize_financial_model","tool_id":"toolu_01FuQRU2GNmUuWkdTibJGiXj","input":{},"time":"2025-07-24T17:28:18-04:00","message":"Executing individual tool in batch"}
{"level":"info","tool":"organize_financial_model","session":"session_638889892307001200","tool_id":"toolu_01FuQRU2GNmUuWkdTibJGiXj","input":{},"autonomy_mode":"agent-default","time":"2025-07-24T17:28:18-04:00","message":"Executing Excel tool"}
{"level":"info","session":"session_638889892307001200","time":"2025-07-24T17:28:18-04:00","message":"Starting financial model organization"}
{"level":"debug","range":"A1:Z100","time":"2025-07-24T17:28:18-04:00","message":"Reading current model structure"}
{"level":"debug","session_id":"session_638889892307001200","initial_client_id":"session_638889892307001200","has_client_id_resolver":true,"time":"2025-07-24T17:28:18-04:00","message":"Starting client ID resolution"}
{"level":"info","session":"session_638889892307001200","iteration":0,"queued_tools":1,"time":"2025-07-24T17:28:18-04:00","message":"Tools returned queued status, continuing conversation"}
{"level":"debug","message":"Client ID resolver called","session_id":"session_638889892307001200","time":"2025-07-24T17:28:18.007Z","total_sessions":1}
{"available_session_id":"session_638889892307001200","client_id":"session_638889892307001200","level":"debug","message":"Available session in resolver","time":"2025-07-24T17:28:18.007Z","user_id":""}
{"client_id":"session_638889892307001200","level":"info","message":"Client ID resolver found session","session_id":"session_638889892307001200","time":"2025-07-24T17:28:18.007Z","user_id":""}
{"level":"info","session":"session_638889892307001200","tools_count":19,"autonomy_mode":"agent-default","iteration":1,"time":"2025-07-24T17:28:18-04:00","message":"Starting streaming iteration with tools"}
{"level":"debug","session_id":"session_638889892307001200","resolved_client_id":"session_638889892307001200","time":"2025-07-24T17:28:18-04:00","message":"Client ID resolved via resolver function"}
{"level":"info","session_id":"session_638889892307001200","final_client_id":"session_638889892307001200","request_id":"2de66fca-0b62-4935-a3b6-0baa0891d319","session_equals_client":true,"time":"2025-07-24T17:28:18-04:00","message":"Final client ID resolution for tool request"}
{"level":"info","session_id":"session_638889892307001200","client_id":"session_638889892307001200","request_id":"2de66fca-0b62-4935-a3b6-0baa0891d319","time":"2025-07-24T17:28:18-04:00","message":"Registering tool handler for response"}
{"level":"info","session_id":"session_638889892307001200","request_id":"2de66fca-0b62-4935-a3b6-0baa0891d319","time":"2025-07-24T17:28:18-04:00","message":"Sending tool request via SignalR bridge"}
{"level":"error","status_code":400,"response_body":"{\"type\":\"error\",\"error\":{\"type\":\"invalid_request_error\",\"message\":\"messages.1.content.1.tool_use.input: Field required\"}}","time":"2025-07-24T17:28:18-04:00","message":"Anthropic API error details"}
{"level":"debug","session_id":"session_638889892307001200","client_id":"session_638889892307001200","request_id":"2de66fca-0b62-4935-a3b6-0baa0891d319","time":"2025-07-24T17:28:48-04:00","message":"Unregistering tool handler after final response"}
{"level":"info","session_id":"session_638889892307001200","total_results":1,"successful":0,"time":"2025-07-24T17:28:48-04:00","message":"Tool calls processing completed"}
{"has_error":false,"is_queued":false,"level":"debug","message":"Sent tool result chunk","time":"2025-07-24T17:28:48.008Z","tool_name":"organize_financial_model"}
{"content_length":271,"level":"info","message":"Streaming completed","session_id":"session_638889892307001200","time":"2025-07-24T17:28:48.008Z","tool_calls_count":1}
{"chunk_number":31,"chunk_type":"tool_result","elapsed_ms":36285,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:28:48.008Z"}
{"chunk_number":32,"chunk_type":"","elapsed_ms":36286,"has_delta":false,"is_done":true,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:28:48.008Z"}
{"avg_chunk_time_ms":1133,"duration_ms":36286,"level":"info","message":"Streaming completed","time":"2025-07-24T17:28:48.008Z","total_chunks":32}
{"duration_ms":36286,"level":"info","message":"Request processed successfully","method":"GET","path":"/api/chat/stream","query":"sessionId=session_638889892307001200\u0026content=Please%20make%20DCF%20model%20in%20this%20sheet%2C%20use%20mock%20data\u0026autonomyMode=agent-default\u0026token=dev-token-123","remote_ip":"[::1]","request_id":"51d51184-d08f-4cf9-870d-01c5610972db","route_pattern":"/api/chat/stream","size":5825,"status":200,"time":"2025-07-24T17:28:48.008Z","user_agent":""}
{"content_length":271,"level":"info","message":"Streaming completed","session_id":"session_638889892307001200","time":"2025-07-24T17:28:48.008Z","tool_calls_count":1}
{"acknowledged":false,"has_details":false,"has_error":false,"has_metadata":false,"level":"info","message":"Received tool response from SignalR","queued":true,"request_id":"2de66fca-0b62-4935-a3b6-0baa0891d319","time":"2025-07-24T17:28:48.137Z"}
{"level":"warn","component":"excel_bridge","session_id":"session_638889892307001200","request_id":"2de66fca-0b62-4935-a3b6-0baa0891d319","time":"2025-07-24T17:28:48-04:00","message":"No handler found for tool response - queuing for later delivery"}
{"level":"info","message":"Tool response routed to handler","request_id":"2de66fca-0b62-4935-a3b6-0baa0891d319","session_id":"session_638889892307001200","time":"2025-07-24T17:28:48.137Z"}
{"duration_ms":0,"level":"info","message":"Request processed successfully","method":"POST","path":"/api/tool-response","query":"","remote_ip":"[::1]","request_body":{"error":"","errorDetails":null,"metadata":{},"queued":true,"requestId":"2de66fca-0b62-4935-a3b6-0baa0891d319","result":{"message":"read_range request received and processing","status":"acknowledged"},"sessionId":"session_638889892307001200","timestamp":"2025-07-24T21:28:48.134119Z"},"request_id":"3c17c368-7b54-4157-acda-bdc2df95cdd0","response_body":{"message":"Tool response received","success":true},"route_pattern":"/api/tool-response","size":52,"status":200,"time":"2025-07-24T17:28:48.137Z","user_agent":""}
{"acknowledged":false,"has_details":false,"has_error":false,"has_metadata":false,"level":"info","message":"Received tool response from SignalR","queued":false,"request_id":"2de66fca-0b62-4935-a3b6-0baa0891d319","time":"2025-07-24T17:28:48.199Z"}
{"level":"warn","component":"excel_bridge","session_id":"session_638889892307001200","request_id":"2de66fca-0b62-4935-a3b6-0baa0891d319","time":"2025-07-24T17:28:48-04:00","message":"No handler found for tool response - queuing for later delivery"}
{"level":"debug","message":"Operation not in registry, skipping status update","request_id":"2de66fca-0b62-4935-a3b6-0baa0891d319","time":"2025-07-24T17:28:48.199Z","tool_id":"2de66fca-0b62-4935-a3b6-0baa0891d319"}
{"level":"info","message":"Tool response routed to handler","request_id":"2de66fca-0b62-4935-a3b6-0baa0891d319","session_id":"session_638889892307001200","time":"2025-07-24T17:28:48.199Z"}
{"duration_ms":0,"level":"info","message":"Request processed successfully","method":"POST","path":"/api/tool-response","query":"","remote_ip":"[::1]","request_body":{"error":"","errorDetails":null,"metadata":{},"queued":false,"requestId":"2de66fca-0b62-4935-a3b6-0baa0891d319","result":{"address":"Sheet1!A1:Z100","colCount":0,"formulas":[],"rowCount":0,"values":[]},"sessionId":"session_638889892307001200","timestamp":"2025-07-24T21:28:48.198884Z"},"request_id":"0bdf3e2a-979b-47c8-b502-e726f3d7f061","response_body":{"message":"Tool response received","success":true},"route_pattern":"/api/tool-response","size":52,"status":200,"time":"2025-07-24T17:28:48.199Z","user_agent":""}

