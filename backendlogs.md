Last login: Thu Jul 24 18:23:06 on ttys040
cd '/Users/brendantoole/projects2/gridmate/backend' && echo '--- Go Backend Service ---' && LOG_LEVEL=debug go run cmd/api/main.go
brendantoole@Mac ~ % cd '/Users/brendantoole/projects2/gridmate/backend' && echo '--- Go Backend Service ---' && LOG_LEVEL=debug go run cmd/api/main.go
--- Go Backend Service ---
{"level":"info","message":"Database connection established","time":"2025-07-24T18:23:08.724Z"}
2025/07/24 18:23:08 Starting migrations from path: ./migrations
2025/07/24 18:23:08 Current migration version: 4, dirty: false
2025/07/24 18:23:08 Database migrated to version 4
{"level":"info","executor_is_nil":false,"time":"2025-07-24T18:23:08-04:00","message":"SetToolExecutor called"}
{"level":"info","message":"Tool executor, context builder, and queued ops registry set in AI service","time":"2025-07-24T18:23:08.961Z"}
{"level":"info","message":"Vector memory indexing service initialized with OpenAI embeddings","time":"2025-07-24T18:23:08.961Z"}
{"level":"info","executor_is_nil":false,"time":"2025-07-24T18:23:08-04:00","message":"SetToolExecutor called"}
{"level":"info","message":"Tool executor transferred to main AI service","time":"2025-07-24T18:23:08.961Z"}
{"level":"info","message":"Embedding provider set on tool executor for memory search","time":"2025-07-24T18:23:08.961Z"}
{"level":"info","message":"Context builder transferred to main AI service","time":"2025-07-24T18:23:08.961Z"}
{"level":"info","message":"Queued operations registry transferred to main AI service","time":"2025-07-24T18:23:08.961Z"}
{"level":"info","message":"Initializing advanced AI components (memory, context analyzer, orchestrator)","time":"2025-07-24T18:23:08.961Z"}
{"level":"info","memory_service":true,"context_analyzer":true,"tool_orchestrator":true,"time":"2025-07-24T18:23:08-04:00","message":"Advanced AI components configured"}
{"level":"info","message":"Advanced AI components successfully initialized and connected","time":"2025-07-24T18:23:08.961Z"}
{"level":"info","message":"Starting server on port 8080","time":"2025-07-24T18:23:08.961Z"}
{"autonomy_mode":"agent-default","content":"Please make DCF model in this sheet, use mock data","level":"info","message":"Starting streaming chat request","session_id":"session_638889925947819850","time":"2025-07-24T18:23:17.752Z"}
{"client_id":"session_638889925947819850","has_memory":true,"level":"info","message":"Created new session with memory store","session_id":"session_638889925947819850","time":"2025-07-24T18:23:17.752Z"}
{"level":"info","message":"Session registered","session_id":"session_638889925947819850","time":"2025-07-24T18:23:17.752Z","type":"api","user_id":"session_638889925947819850"}
{"autonomy_mode":"agent-default","history_length":0,"level":"info","message":"Starting streaming chat processing","session_id":"session_638889925947819850","time":"2025-07-24T18:23:17.752Z"}
{"level":"warning","message":"ResponseWriter does not support flushing, attempting to continue anyway","time":"2025-07-24T18:23:17.752Z"}
{"level":"info","session":"session_638889925947819850","tools_count":19,"autonomy_mode":"agent-default","iteration":0,"time":"2025-07-24T18:23:17-04:00","message":"Starting streaming iteration with tools"}
{"chunk_type":"text","first_chunk_delay_ms":6652,"level":"info","message":"First chunk being sent - streaming is active","time":"2025-07-24T18:23:24.405Z"}
{"chunk_number":1,"chunk_type":"text","elapsed_ms":6652,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T18:23:24.405Z"}
{"chunk_number":2,"chunk_type":"text","elapsed_ms":6820,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T18:23:24.573Z"}
{"chunk_number":3,"chunk_type":"text","elapsed_ms":6914,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T18:23:24.667Z"}
{"chunk_number":4,"chunk_type":"text","elapsed_ms":6965,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T18:23:24.718Z"}
{"chunk_number":5,"chunk_type":"text","elapsed_ms":7063,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T18:23:24.816Z"}
{"chunk_number":6,"chunk_type":"text","elapsed_ms":7237,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T18:23:24.990Z"}
{"chunk_number":7,"chunk_type":"text","elapsed_ms":7472,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T18:23:25.225Z"}
{"chunk_number":8,"chunk_type":"text","elapsed_ms":7817,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T18:23:25.570Z"}
{"chunk_number":9,"chunk_type":"text","elapsed_ms":7817,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T18:23:25.570Z"}
{"chunk_number":10,"chunk_type":"text","elapsed_ms":7817,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T18:23:25.570Z"}
{"chunk_number":11,"chunk_type":"text","elapsed_ms":7909,"has_delta":true,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T18:23:25.662Z"}
{"chunk_number":12,"chunk_type":"tool_start","elapsed_ms":8275,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T18:23:26.028Z"}
{"chunk_number":13,"chunk_type":"tool_progress","elapsed_ms":8277,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T18:23:26.030Z"}
{"chunk_number":14,"chunk_type":"tool_progress","elapsed_ms":8843,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T18:23:26.595Z"}
{"chunk_number":15,"chunk_type":"tool_progress","elapsed_ms":8843,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T18:23:26.596Z"}
{"chunk_number":16,"chunk_type":"tool_progress","elapsed_ms":8843,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T18:23:26.596Z"}
{"chunk_number":17,"chunk_type":"tool_progress","elapsed_ms":8843,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T18:23:26.596Z"}
{"chunk_number":18,"chunk_type":"tool_progress","elapsed_ms":9151,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T18:23:26.903Z"}
{"chunk_number":19,"chunk_type":"tool_progress","elapsed_ms":9151,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T18:23:26.904Z"}
{"chunk_number":20,"chunk_type":"tool_progress","elapsed_ms":9151,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T18:23:26.904Z"}
{"chunk_number":21,"chunk_type":"tool_progress","elapsed_ms":9151,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T18:23:26.904Z"}
{"chunk_number":22,"chunk_type":"tool_progress","elapsed_ms":9151,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T18:23:26.904Z"}
{"chunk_number":23,"chunk_type":"tool_progress","elapsed_ms":9151,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T18:23:26.904Z"}
{"chunk_number":24,"chunk_type":"tool_progress","elapsed_ms":9151,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T18:23:26.904Z"}
{"chunk_number":25,"chunk_type":"tool_progress","elapsed_ms":9330,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T18:23:27.083Z"}
{"chunk_number":26,"chunk_type":"tool_progress","elapsed_ms":9331,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T18:23:27.083Z"}
{"chunk_number":27,"chunk_type":"tool_progress","elapsed_ms":9331,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T18:23:27.083Z"}
{"chunk_number":28,"chunk_type":"tool_progress","elapsed_ms":9331,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T18:23:27.083Z"}
{"level":"info","message":"Executing tool during stream","time":"2025-07-24T18:23:27.086Z","tool_id":"toolu_01T1iur98SZ3qufaUwdMg9zf","tool_name":"organize_financial_model"}
{"level":"info","session_id":"session_638889925947819850","total_tools":1,"tool_names":["organize_financial_model"],"autonomy_mode":"agent-default","time":"2025-07-24T18:23:27-04:00","message":"Processing tool calls"}
{"level":"info","session_id":"session_638889925947819850","total_tools":1,"batch_count":1,"time":"2025-07-24T18:23:27-04:00","message":"Processing tool calls with batch detection"}
{"level":"info","session_id":"session_638889925947819850","batch_index":0,"tools_in_batch":1,"batch_tools":["organize_financial_model"],"time":"2025-07-24T18:23:27-04:00","message":"Processing batch"}
{"level":"debug","tool_name":"organize_financial_model","tool_id":"toolu_01T1iur98SZ3qufaUwdMg9zf","input":{},"time":"2025-07-24T18:23:27-04:00","message":"Executing individual tool in batch"}
{"level":"info","tool":"organize_financial_model","session":"session_638889925947819850","tool_id":"toolu_01T1iur98SZ3qufaUwdMg9zf","input":{},"autonomy_mode":"agent-default","time":"2025-07-24T18:23:27-04:00","message":"Executing Excel tool"}
{"level":"info","session":"session_638889925947819850","time":"2025-07-24T18:23:27-04:00","message":"Starting financial model organization"}
{"level":"debug","range":"A1:Z100","time":"2025-07-24T18:23:27-04:00","message":"Reading current model structure"}
{"level":"debug","session_id":"session_638889925947819850","initial_client_id":"session_638889925947819850","has_client_id_resolver":true,"time":"2025-07-24T18:23:27-04:00","message":"Starting client ID resolution"}
{"chunk_number":29,"chunk_type":"tool_complete","elapsed_ms":9333,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T18:23:27.086Z"}
{"level":"debug","message":"Client ID resolver called","session_id":"session_638889925947819850","time":"2025-07-24T18:23:27.086Z","total_sessions":1}
{"available_session_id":"session_638889925947819850","client_id":"session_638889925947819850","level":"debug","message":"Available session in resolver","time":"2025-07-24T18:23:27.087Z","user_id":""}
{"client_id":"session_638889925947819850","level":"info","message":"Client ID resolver found session","session_id":"session_638889925947819850","time":"2025-07-24T18:23:27.087Z","user_id":""}
{"level":"debug","session_id":"session_638889925947819850","resolved_client_id":"session_638889925947819850","time":"2025-07-24T18:23:27-04:00","message":"Client ID resolved via resolver function"}
{"level":"info","session_id":"session_638889925947819850","final_client_id":"session_638889925947819850","request_id":"6339e9cf-3378-463d-928b-d85a2c1be9ea","session_equals_client":true,"time":"2025-07-24T18:23:27-04:00","message":"Final client ID resolution for tool request"}
{"level":"info","session_id":"session_638889925947819850","client_id":"session_638889925947819850","request_id":"6339e9cf-3378-463d-928b-d85a2c1be9ea","time":"2025-07-24T18:23:27-04:00","message":"Registering tool handler for response"}
{"level":"info","session_id":"session_638889925947819850","request_id":"6339e9cf-3378-463d-928b-d85a2c1be9ea","time":"2025-07-24T18:23:27-04:00","message":"Sending tool request via SignalR bridge"}
{"level":"debug","session_id":"session_638889925947819850","client_id":"session_638889925947819850","request_id":"6339e9cf-3378-463d-928b-d85a2c1be9ea","time":"2025-07-24T18:23:57-04:00","message":"Unregistering tool handler after final response"}
{"level":"info","session_id":"session_638889925947819850","total_results":1,"successful":0,"time":"2025-07-24T18:23:57-04:00","message":"Tool calls processing completed"}
{"has_error":false,"is_queued":false,"level":"debug","message":"Sent tool result chunk","time":"2025-07-24T18:23:57.087Z","tool_name":"organize_financial_model"}
{"content_length":0,"level":"info","message":"Streaming completed","session_id":"session_638889925947819850","time":"2025-07-24T18:23:57.087Z","tool_calls_count":1}
{"chunk_number":30,"chunk_type":"tool_result","elapsed_ms":39334,"has_delta":false,"is_done":false,"level":"debug","message":"Sending chunk","time":"2025-07-24T18:23:57.087Z"}
{"chunk_number":31,"chunk_type":"","elapsed_ms":39334,"has_delta":false,"is_done":true,"level":"debug","message":"Sending chunk","time":"2025-07-24T18:23:57.087Z"}
{"avg_chunk_time_ms":1268,"duration_ms":39334,"level":"info","message":"Streaming completed","time":"2025-07-24T18:23:57.087Z","total_chunks":31}
{"duration_ms":39334,"level":"info","message":"Request processed successfully","method":"GET","path":"/api/chat/stream","query":"sessionId=session_638889925947819850\u0026content=Please%20make%20DCF%20model%20in%20this%20sheet%2C%20use%20mock%20data\u0026autonomyMode=agent-default\u0026token=dev-token-123","remote_ip":"[::1]","request_id":"42f5a524-b0b9-40a9-a5be-05cc2218ec2c","route_pattern":"/api/chat/stream","size":5455,"status":200,"time":"2025-07-24T18:23:57.087Z","user_agent":""}
{"acknowledged":false,"has_details":false,"has_error":false,"has_metadata":false,"level":"info","message":"Received tool response from SignalR","queued":true,"request_id":"6339e9cf-3378-463d-928b-d85a2c1be9ea","time":"2025-07-24T18:23:57.212Z"}
{"level":"warn","component":"excel_bridge","session_id":"session_638889925947819850","request_id":"6339e9cf-3378-463d-928b-d85a2c1be9ea","time":"2025-07-24T18:23:57-04:00","message":"No handler found for tool response - queuing for later delivery"}
{"level":"info","message":"Tool response routed to handler","request_id":"6339e9cf-3378-463d-928b-d85a2c1be9ea","session_id":"session_638889925947819850","time":"2025-07-24T18:23:57.212Z"}
{"duration_ms":0,"level":"info","message":"Request processed successfully","method":"POST","path":"/api/tool-response","query":"","remote_ip":"[::1]","request_body":{"error":"","errorDetails":null,"metadata":{},"queued":true,"requestId":"6339e9cf-3378-463d-928b-d85a2c1be9ea","result":{"message":"read_range request received and processing","status":"acknowledged"},"sessionId":"session_638889925947819850","timestamp":"2025-07-24T22:23:57.20519Z"},"request_id":"8f574e9f-5a06-470b-b6fb-4b0d0c4cf760","response_body":{"message":"Tool response received","success":true},"route_pattern":"/api/tool-response","size":52,"status":200,"time":"2025-07-24T18:23:57.212Z","user_agent":""}
{"acknowledged":false,"has_details":false,"has_error":false,"has_metadata":false,"level":"info","message":"Received tool response from SignalR","queued":false,"request_id":"6339e9cf-3378-463d-928b-d85a2c1be9ea","time":"2025-07-24T18:23:57.297Z"}
{"level":"warn","component":"excel_bridge","session_id":"session_638889925947819850","request_id":"6339e9cf-3378-463d-928b-d85a2c1be9ea","time":"2025-07-24T18:23:57-04:00","message":"No handler found for tool response - queuing for later delivery"}
{"level":"debug","message":"Operation not in registry, skipping status update","request_id":"6339e9cf-3378-463d-928b-d85a2c1be9ea","time":"2025-07-24T18:23:57.297Z","tool_id":"6339e9cf-3378-463d-928b-d85a2c1be9ea"}
{"level":"info","message":"Tool response routed to handler","request_id":"6339e9cf-3378-463d-928b-d85a2c1be9ea","session_id":"session_638889925947819850","time":"2025-07-24T18:23:57.297Z"}
{"duration_ms":0,"level":"info","message":"Request processed successfully","method":"POST","path":"/api/tool-response","query":"","remote_ip":"[::1]","request_body":{"error":"","errorDetails":null,"metadata":{},"queued":false,"requestId":"6339e9cf-3378-463d-928b-d85a2c1be9ea","result":{"address":"Sheet1!A1:Z100","colCount":0,"formulas":[],"rowCount":0,"values":[]},"sessionId":"session_638889925947819850","timestamp":"2025-07-24T22:23:57.296501Z"},"request_id":"10768d72-01dc-4b84-ab82-b6b44456043f","response_body":{"message":"Tool response received","success":true},"route_pattern":"/api/tool-response","size":52,"status":200,"time":"2025-07-24T18:23:57.297Z","user_agent":""}

