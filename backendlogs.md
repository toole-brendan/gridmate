Last login: Thu Jul 24 17:54:01 on ttys050
cd '/Users/brendantoole/projects2/gridmate/backend' && echo '--- Go Backend Service ---' && LOG_LEVEL=debug go run cmd/api/main.go
brendantoole@Mac ~ % cd '/Users/brendantoole/projects2/gridmate/backend' && echo '--- Go Backend Service ---' && LOG_LEVEL=debug go run cmd/api/main.go
--- Go Backend Service ---
{"level":"info","message":"Database connection established","time":"2025-07-24T17:54:03.907Z"}
2025/07/24 17:54:03 Starting migrations from path: ./migrations
2025/07/24 17:54:04 Current migration version: 4, dirty: false
2025/07/24 17:54:04 Database migrated to version 4
{"level":"info","executor_is_nil":false,"time":"2025-07-24T17:54:04-04:00","message":"SetToolExecutor called"}
{"level":"info","message":"Tool executor, context builder, and queued ops registry set in AI service","time":"2025-07-24T17:54:04.182Z"}
{"level":"info","message":"Vector memory indexing service initialized with OpenAI embeddings","time":"2025-07-24T17:54:04.182Z"}
{"level":"info","executor_is_nil":false,"time":"2025-07-24T17:54:04-04:00","message":"SetToolExecutor called"}
{"level":"info","message":"Tool executor transferred to main AI service","time":"2025-07-24T17:54:04.182Z"}
{"level":"info","message":"Embedding provider set on tool executor for memory search","time":"2025-07-24T17:54:04.182Z"}
{"level":"info","message":"Context builder transferred to main AI service","time":"2025-07-24T17:54:04.182Z"}
{"level":"info","message":"Queued operations registry transferred to main AI service","time":"2025-07-24T17:54:04.182Z"}
{"level":"info","message":"Initializing advanced AI components (memory, context analyzer, orchestrator)","time":"2025-07-24T17:54:04.182Z"}
{"level":"info","memory_service":true,"context_analyzer":true,"tool_orchestrator":true,"time":"2025-07-24T17:54:04-04:00","message":"Advanced AI components configured"}
{"level":"info","message":"Advanced AI components successfully initialized and connected","time":"2025-07-24T17:54:04.182Z"}
{"level":"info","message":"Starting server on port 8080","time":"2025-07-24T17:54:04.182Z"}
{"autonomy_mode":"agent-default","content":"Please make DCF model in this sheet, use mock data","level":"info","message":"Starting streaming chat request","session_id":"session_638889908495158730","time":"2025-07-24T17:54:18.642Z"}
{"client_id":"session_638889908495158730","has_memory":true,"level":"info","message":"Created new session with memory store","session_id":"session_638889908495158730","time":"2025-07-24T17:54:18.642Z"}
{"level":"info","message":"Session registered","session_id":"session_638889908495158730","time":"2025-07-24T17:54:18.642Z","type":"api","user_id":"session_638889908495158730"}
{"autonomy_mode":"agent-default","history_length":0,"level":"info","message":"Starting streaming chat processing","session_id":"session_638889908495158730","time":"2025-07-24T17:54:18.642Z"}
{"level":"warning","message":"ResponseWriter does not support flushing, attempting to continue anyway","time":"2025-07-24T17:54:18.643Z"}
{"level":"info","session":"session_638889908495158730","tools_count":19,"autonomy_mode":"agent-default","iteration":0,"time":"2025-07-24T17:54:18-04:00","message":"Starting streaming iteration with tools"}
{"chunk_type":"text","first_chunk_delay_ms":1193,"level":"info","message":"First chunk being sent - streaming is active","time":"2025-07-24T17:54:19.836Z"}
{"chunk_number":1,"chunk_type":"text","elapsed_ms":1193,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:54:19.836Z"}
{"chunk_number":2,"chunk_type":"text","elapsed_ms":1235,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:54:19.878Z"}
{"chunk_number":3,"chunk_type":"text","elapsed_ms":1283,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:54:19.926Z"}
{"chunk_number":4,"chunk_type":"text","elapsed_ms":1354,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:54:19.997Z"}
{"chunk_number":5,"chunk_type":"text","elapsed_ms":1388,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:54:20.031Z"}
{"chunk_number":6,"chunk_type":"text","elapsed_ms":1448,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:54:20.091Z"}
{"chunk_number":7,"chunk_type":"text","elapsed_ms":1503,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:54:20.146Z"}
{"chunk_number":8,"chunk_type":"text","elapsed_ms":1547,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:54:20.190Z"}
{"chunk_number":9,"chunk_type":"text","elapsed_ms":1598,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:54:20.241Z"}
{"chunk_number":10,"chunk_type":"text","elapsed_ms":1645,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:54:20.288Z"}
{"chunk_number":11,"chunk_type":"text","elapsed_ms":1691,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:54:20.334Z"}
{"chunk_number":12,"chunk_type":"text","elapsed_ms":1741,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:54:20.384Z"}
{"chunk_number":13,"chunk_type":"text","elapsed_ms":1785,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:54:20.428Z"}
{"chunk_number":14,"chunk_type":"text","elapsed_ms":1832,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:54:20.475Z"}
{"chunk_number":15,"chunk_type":"text","elapsed_ms":1879,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:54:20.522Z"}
{"chunk_number":16,"chunk_type":"text","elapsed_ms":1931,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:54:20.574Z"}
{"chunk_number":17,"chunk_type":"text","elapsed_ms":1976,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:54:20.619Z"}
{"chunk_number":18,"chunk_type":"text","elapsed_ms":2023,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:54:20.666Z"}
{"chunk_number":19,"chunk_type":"text","elapsed_ms":2070,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:54:20.713Z"}
{"chunk_number":20,"chunk_type":"text","elapsed_ms":2118,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:54:20.761Z"}
{"chunk_number":21,"chunk_type":"text","elapsed_ms":2166,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:54:20.809Z"}
{"chunk_number":22,"chunk_type":"text","elapsed_ms":2214,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:54:20.857Z"}
{"chunk_number":23,"chunk_type":"text","elapsed_ms":2265,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:54:20.908Z"}
{"chunk_number":24,"chunk_type":"tool_start","elapsed_ms":2595,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:54:21.238Z"}
{"chunk_number":25,"chunk_type":"tool_progress","elapsed_ms":2595,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:54:21.238Z"}
{"chunk_number":26,"chunk_type":"tool_progress","elapsed_ms":2983,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:54:21.626Z"}
{"chunk_number":27,"chunk_type":"tool_progress","elapsed_ms":2983,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:54:21.626Z"}
{"chunk_number":28,"chunk_type":"tool_progress","elapsed_ms":2984,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:54:21.626Z"}
{"chunk_number":29,"chunk_type":"tool_progress","elapsed_ms":3223,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:54:21.866Z"}
{"chunk_number":30,"chunk_type":"tool_progress","elapsed_ms":3223,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:54:21.866Z"}
{"chunk_number":31,"chunk_type":"tool_progress","elapsed_ms":3223,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:54:21.866Z"}
{"chunk_number":32,"chunk_type":"tool_progress","elapsed_ms":3223,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:54:21.866Z"}
{"chunk_number":33,"chunk_type":"tool_progress","elapsed_ms":3223,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:54:21.866Z"}
{"chunk_number":34,"chunk_type":"tool_progress","elapsed_ms":3223,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:54:21.866Z"}
{"chunk_number":35,"chunk_type":"tool_progress","elapsed_ms":3223,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:54:21.866Z"}
{"chunk_number":36,"chunk_type":"tool_progress","elapsed_ms":3479,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:54:22.122Z"}
{"chunk_number":37,"chunk_type":"tool_progress","elapsed_ms":3482,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:54:22.125Z"}
{"chunk_number":38,"chunk_type":"tool_progress","elapsed_ms":3482,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:54:22.125Z"}
{"chunk_number":39,"chunk_type":"tool_progress","elapsed_ms":3482,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:54:22.125Z"}
{"level":"info","message":"Executing tool during stream","time":"2025-07-24T17:54:22.127Z","tool_id":"toolu_01CKhLAQVHVmrp9YcVbUmgTR","tool_name":"organize_financial_model"}
{"level":"info","session_id":"session_638889908495158730","total_tools":1,"tool_names":["organize_financial_model"],"autonomy_mode":"agent-default","time":"2025-07-24T17:54:22-04:00","message":"Processing tool calls"}
{"level":"info","session_id":"session_638889908495158730","total_tools":1,"batch_count":1,"time":"2025-07-24T17:54:22-04:00","message":"Processing tool calls with batch detection"}
{"level":"info","session_id":"session_638889908495158730","batch_index":0,"tools_in_batch":1,"batch_tools":["organize_financial_model"],"time":"2025-07-24T17:54:22-04:00","message":"Processing batch"}
{"level":"debug","tool_name":"organize_financial_model","tool_id":"toolu_01CKhLAQVHVmrp9YcVbUmgTR","input":{},"time":"2025-07-24T17:54:22-04:00","message":"Executing individual tool in batch"}
{"chunk_number":40,"chunk_type":"tool_progress","elapsed_ms":3484,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:54:22.127Z"}
{"level":"info","tool":"organize_financial_model","session":"session_638889908495158730","tool_id":"toolu_01CKhLAQVHVmrp9YcVbUmgTR","input":{},"autonomy_mode":"agent-default","time":"2025-07-24T17:54:22-04:00","message":"Executing Excel tool"}
{"chunk_number":41,"chunk_type":"tool_complete","elapsed_ms":3484,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:54:22.127Z"}
{"level":"info","session":"session_638889908495158730","time":"2025-07-24T17:54:22-04:00","message":"Starting financial model organization"}
{"level":"debug","range":"A1:Z100","time":"2025-07-24T17:54:22-04:00","message":"Reading current model structure"}
{"level":"debug","session_id":"session_638889908495158730","initial_client_id":"session_638889908495158730","has_client_id_resolver":true,"time":"2025-07-24T17:54:22-04:00","message":"Starting client ID resolution"}
{"level":"debug","message":"Client ID resolver called","session_id":"session_638889908495158730","time":"2025-07-24T17:54:22.127Z","total_sessions":1}
{"available_session_id":"session_638889908495158730","client_id":"session_638889908495158730","level":"debug","message":"Available session in resolver","time":"2025-07-24T17:54:22.127Z","user_id":""}
{"client_id":"session_638889908495158730","level":"info","message":"Client ID resolver found session","session_id":"session_638889908495158730","time":"2025-07-24T17:54:22.127Z","user_id":""}
{"level":"debug","session_id":"session_638889908495158730","resolved_client_id":"session_638889908495158730","time":"2025-07-24T17:54:22-04:00","message":"Client ID resolved via resolver function"}
{"level":"info","session_id":"session_638889908495158730","final_client_id":"session_638889908495158730","request_id":"daad36d7-9fcd-4413-a8bf-fbf98a484373","session_equals_client":true,"time":"2025-07-24T17:54:22-04:00","message":"Final client ID resolution for tool request"}
{"level":"info","session_id":"session_638889908495158730","client_id":"session_638889908495158730","request_id":"daad36d7-9fcd-4413-a8bf-fbf98a484373","time":"2025-07-24T17:54:22-04:00","message":"Registering tool handler for response"}
{"level":"info","session_id":"session_638889908495158730","request_id":"daad36d7-9fcd-4413-a8bf-fbf98a484373","time":"2025-07-24T17:54:22-04:00","message":"Sending tool request via SignalR bridge"}
{"level":"debug","session_id":"session_638889908495158730","client_id":"session_638889908495158730","request_id":"daad36d7-9fcd-4413-a8bf-fbf98a484373","time":"2025-07-24T17:54:52-04:00","message":"Unregistering tool handler after final response"}
{"level":"info","session_id":"session_638889908495158730","total_results":1,"successful":0,"time":"2025-07-24T17:54:52-04:00","message":"Tool calls processing completed"}
{"has_error":false,"is_queued":false,"level":"debug","message":"Sent tool result chunk","time":"2025-07-24T17:54:52.127Z","tool_name":"organize_financial_model"}
{"content_length":257,"level":"info","message":"Streaming completed","session_id":"session_638889908495158730","time":"2025-07-24T17:54:52.127Z","tool_calls_count":1}
{"chunk_number":42,"chunk_type":"tool_result","elapsed_ms":33485,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:54:52.127Z"}
{"chunk_number":43,"chunk_type":"","elapsed_ms":33485,"has_delta":false,"is_done":true,"level":"debug","message":"Sending chunk","time":"2025-07-24T17:54:52.127Z"}
{"avg_chunk_time_ms":778,"duration_ms":33485,"level":"info","message":"Streaming completed","time":"2025-07-24T17:54:52.127Z","total_chunks":43}
{"duration_ms":33485,"level":"info","message":"Request processed successfully","method":"GET","path":"/api/chat/stream","query":"sessionId=session_638889908495158730\u0026content=Please%20make%20DCF%20model%20in%20this%20sheet%2C%20use%20mock%20data\u0026autonomyMode=agent-default\u0026token=dev-token-123","remote_ip":"[::1]","request_id":"99a80272-2cbb-46f1-822c-c8197c5fe97f","route_pattern":"/api/chat/stream","size":6853,"status":200,"time":"2025-07-24T17:54:52.127Z","user_agent":""}
{"acknowledged":false,"has_details":false,"has_error":false,"has_metadata":false,"level":"info","message":"Received tool response from SignalR","queued":true,"request_id":"daad36d7-9fcd-4413-a8bf-fbf98a484373","time":"2025-07-24T17:54:52.321Z"}
{"level":"warn","component":"excel_bridge","session_id":"session_638889908495158730","request_id":"daad36d7-9fcd-4413-a8bf-fbf98a484373","time":"2025-07-24T17:54:52-04:00","message":"No handler found for tool response - queuing for later delivery"}
{"level":"info","message":"Tool response routed to handler","request_id":"daad36d7-9fcd-4413-a8bf-fbf98a484373","session_id":"session_638889908495158730","time":"2025-07-24T17:54:52.321Z"}
{"duration_ms":0,"level":"info","message":"Request processed successfully","method":"POST","path":"/api/tool-response","query":"","remote_ip":"[::1]","request_body":{"error":"","errorDetails":null,"metadata":{},"queued":true,"requestId":"daad36d7-9fcd-4413-a8bf-fbf98a484373","result":{"message":"read_range request received and processing","status":"acknowledged"},"sessionId":"session_638889908495158730","timestamp":"2025-07-24T21:54:52.318002Z"},"request_id":"940fd5c7-93bd-4aad-8f15-376ad5027c12","response_body":{"message":"Tool response received","success":true},"route_pattern":"/api/tool-response","size":52,"status":200,"time":"2025-07-24T17:54:52.321Z","user_agent":""}
{"acknowledged":false,"has_details":false,"has_error":false,"has_metadata":false,"level":"info","message":"Received tool response from SignalR","queued":false,"request_id":"daad36d7-9fcd-4413-a8bf-fbf98a484373","time":"2025-07-24T17:54:52.385Z"}
{"level":"warn","component":"excel_bridge","session_id":"session_638889908495158730","request_id":"daad36d7-9fcd-4413-a8bf-fbf98a484373","time":"2025-07-24T17:54:52-04:00","message":"No handler found for tool response - queuing for later delivery"}
{"level":"debug","message":"Operation not in registry, skipping status update","request_id":"daad36d7-9fcd-4413-a8bf-fbf98a484373","time":"2025-07-24T17:54:52.385Z","tool_id":"daad36d7-9fcd-4413-a8bf-fbf98a484373"}
{"level":"info","message":"Tool response routed to handler","request_id":"daad36d7-9fcd-4413-a8bf-fbf98a484373","session_id":"session_638889908495158730","time":"2025-07-24T17:54:52.385Z"}
{"duration_ms":0,"level":"info","message":"Request processed successfully","method":"POST","path":"/api/tool-response","query":"","remote_ip":"[::1]","request_body":{"error":"","errorDetails":null,"metadata":{},"queued":false,"requestId":"daad36d7-9fcd-4413-a8bf-fbf98a484373","result":{"address":"Sheet1!A1:Z100","colCount":0,"formulas":[],"rowCount":0,"values":[]},"sessionId":"session_638889908495158730","timestamp":"2025-07-24T21:54:52.384201Z"},"request_id":"8aebcadf-b7a1-4e2f-b294-0f7b33c07843","response_body":{"message":"Tool response received","success":true},"route_pattern":"/api/tool-response","size":52,"status":200,"time":"2025-07-24T17:54:52.385Z","user_agent":""}

