Last login: Thu Jul 24 14:07:56 on ttys034
cd '/Users/brendantoole/projects2/gridmate/signalr-service/GridmateSignalR' && echo '--- .NET SignalR Service ---' && /usr/local/share/dotnet/dotnet run --launch-profile https
brendantoole@Mac ~ % cd '/Users/brendantoole/projects2/gridmate/signalr-service/GridmateSignalR' && echo '--- .NET SignalR Service ---' && /usr/local/share/dotnet/dotnet run --launch-profile https
--- .NET SignalR Service ---
Using launch settings from /Users/brendantoole/projects2/gridmate/signalr-service/GridmateSignalR/Properties/launchSettings.json...
Building...
/Users/brendantoole/projects2/gridmate/signalr-service/GridmateSignalR/Hubs/GridmateHub.cs(389,32): warning CS8600: Converting null literal or possible null value to non-nullable type.
/Users/brendantoole/projects2/gridmate/signalr-service/GridmateSignalR/Hubs/GridmateHub.cs(480,32): warning CS8600: Converting null literal or possible null value to non-nullable type.
info: GridmateSignalR.Services.SessionCleanupService[0]
      SessionCleanupService started
info: Microsoft.Hosting.Lifetime[14]
      Now listening on: https://localhost:7171
info: Microsoft.Hosting.Lifetime[14]
      Now listening on: http://localhost:5252
info: Microsoft.Hosting.Lifetime[0]
      Application started. Press Ctrl+C to shut down.
info: Microsoft.Hosting.Lifetime[0]
      Hosting environment: Development
info: Microsoft.Hosting.Lifetime[0]
      Content root path: /Users/brendantoole/projects2/gridmate/signalr-service/GridmateSignalR
info: GridmateSignalR.Hubs.GridmateHub[0]
      Client connected: X5-6fGi0jigNMPk8dPH8qw
info: GridmateSignalR.Hubs.GridmateHub[0]
      Authentication attempt for connection: X5-6fGi0jigNMPk8dPH8qw
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] StreamChat request received for session session_638889775397273050
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Starting streaming request to /api/chat/stream?sessionId=session_638889775397273050&content=Please%20make%20DCF%20model%20in%20this%20sheet%2C%20use%20mock%20data&autonomyMode=agent-default&token=dev-token-123
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request GET http://localhost:8080/api/chat/stream?*
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request GET http://localhost:8080/api/chat/stream?*
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 3519.938ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 3532.306ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Streaming completed for session session_638889775397273050. Total chunks: 36, Duration: 387.802ms
fail: Microsoft.AspNetCore.Server.Kestrel[0]
      Unexpected exception in TimingPipeFlusher.FlushAsync.
      System.IO.IOException: The encryption operation failed, see inner exception.
       ---> System.ComponentModel.Win32Exception (14): Bad address
         --- End of inner exception stack trace ---
         at System.Net.Security.SslStream.WriteSingleChunk[TIOAdapter](ReadOnlyMemory`1 buffer, CancellationToken cancellationToken)
         at System.Net.Security.SslStream.WriteAsyncInternal[TIOAdapter](ReadOnlyMemory`1 buffer, CancellationToken cancellationToken)
         at System.Runtime.CompilerServices.AsyncMethodBuilderCore.Start[TStateMachine](TStateMachine& stateMachine)
         at System.Net.Security.SslStream.WriteAsync(ReadOnlyMemory`1 buffer, CancellationToken cancellationToken)
         at System.IO.Pipelines.StreamPipeWriter.FlushAsyncInternal(Boolean writeToStream, ReadOnlyMemory`1 data, CancellationToken cancellationToken)
         at System.Runtime.CompilerServices.AsyncMethodBuilderCore.Start[TStateMachine](TStateMachine& stateMachine)
         at Microsoft.AspNetCore.Server.Kestrel.Core.Internal.Infrastructure.PipeWriterHelpers.TimingPipeFlusher.FlushAsync(MinDataRate minRate, Int64 count, IHttpOutputAborter outputAborter, CancellationToken cancellationToken)
         at Microsoft.AspNetCore.Server.Kestrel.Core.Internal.Http2.Http2FrameWriter.WriteGoAwayAsync(Int32 lastStreamId, Http2ErrorCode errorCode)
         at Microsoft.AspNetCore.Server.Kestrel.Core.Internal.Http2.Http2Connection.UpdateConnectionState()
         at Microsoft.AspNetCore.Server.Kestrel.Core.Internal.Http2.Http2Connection.ProcessRequestsAsync[TContext](IHttpApplication`1 application)
         at System.Threading.ExecutionContext.RunFromThreadPoolDispatchLoop(Thread threadPoolThread, ExecutionContext executionContext, ContextCallback callback, Object state)
         at System.Runtime.CompilerServices.AsyncTaskMethodBuilder`1.AsyncStateMachineBox`1.MoveNext(Thread threadPoolThread)
         at System.Threading.ThreadPoolWorkQueue.Dispatch()
         at System.Threading.PortableThreadPool.WorkerThread.WorkerThreadStart()
         at System.Threading.Thread.StartCallback()
      --- End of stack trace from previous location ---
         at System.Net.Security.SslStream.WriteAsyncInternal[TIOAdapter](ReadOnlyMemory`1 buffer, CancellationToken cancellationToken)
         at System.IO.Pipelines.StreamPipeWriter.FlushAsyncInternal(Boolean writeToStream, ReadOnlyMemory`1 data, CancellationToken cancellationToken)
         at System.Runtime.CompilerServices.PoolingAsyncValueTaskMethodBuilder`1.StateMachineBox`1.System.Threading.Tasks.Sources.IValueTaskSource<TResult>.GetResult(Int16 token)
         at Microsoft.AspNetCore.Server.Kestrel.Core.Internal.Infrastructure.PipeWriterHelpers.ConcurrentPipeWriter.FlushAsyncAwaited(ValueTask`1 flushTask, CancellationToken cancellationToken)
         at Microsoft.AspNetCore.Server.Kestrel.Core.Internal.Infrastructure.PipeWriterHelpers.TimingPipeFlusher.TimeFlushAsyncAwaited(ValueTask`1 pipeFlushTask, MinDataRate minRate, IHttpOutputAborter outputAborter, CancellationToken cancellationToken)
fail: Microsoft.AspNetCore.Server.Kestrel[0]
      Unhandled exception while processing 0HNEARMGI06SV.
      System.IO.IOException: The encryption operation failed, see inner exception.
       ---> System.ComponentModel.Win32Exception (14): Bad address
         --- End of inner exception stack trace ---
         at System.Net.Security.SslStream.WriteSingleChunk[TIOAdapter](ReadOnlyMemory`1 buffer, CancellationToken cancellationToken)
         at System.Net.Security.SslStream.WriteAsyncInternal[TIOAdapter](ReadOnlyMemory`1 buffer, CancellationToken cancellationToken)
         at System.Runtime.CompilerServices.AsyncMethodBuilderCore.Start[TStateMachine](TStateMachine& stateMachine)
         at System.Net.Security.SslStream.WriteAsync(ReadOnlyMemory`1 buffer, CancellationToken cancellationToken)
         at System.IO.Pipelines.StreamPipeWriter.FlushAsyncInternal(Boolean writeToStream, ReadOnlyMemory`1 data, CancellationToken cancellationToken)
         at System.Runtime.CompilerServices.AsyncMethodBuilderCore.Start[TStateMachine](TStateMachine& stateMachine)
         at System.IO.Pipelines.StreamPipeWriter.FlushAsyncInternal(Boolean writeToStream, ReadOnlyMemory`1 data, CancellationToken cancellationToken)
         at System.IO.Pipelines.StreamPipeWriter.CompleteAsync(Exception exception)
         at System.Runtime.CompilerServices.AsyncMethodBuilderCore.Start[TStateMachine](TStateMachine& stateMachine)
         at System.IO.Pipelines.StreamPipeWriter.CompleteAsync(Exception exception)
         at Microsoft.AspNetCore.Server.Kestrel.Core.Internal.DuplexPipeStreamAdapter`1.DisposeAsync()
         at System.Runtime.CompilerServices.AsyncMethodBuilderCore.Start[TStateMachine](TStateMachine& stateMachine)
         at Microsoft.AspNetCore.Server.Kestrel.Core.Internal.DuplexPipeStreamAdapter`1.DisposeAsync()
         at Microsoft.AspNetCore.Server.Kestrel.Https.Internal.HttpsConnectionMiddleware.OnConnectionAsync(ConnectionContext context)
         at System.Runtime.CompilerServices.AsyncTaskMethodBuilder`1.AsyncStateMachineBox`1.ExecutionContextCallback(Object s)
         at System.Threading.ExecutionContext.RunInternal(ExecutionContext executionContext, ContextCallback callback, Object state)
         at System.Runtime.CompilerServices.AsyncTaskMethodBuilder`1.AsyncStateMachineBox`1.MoveNext(Thread threadPoolThread)
         at System.Runtime.CompilerServices.AsyncTaskMethodBuilder`1.AsyncStateMachineBox`1.MoveNext()
         at System.Threading.Tasks.AwaitTaskContinuation.RunOrScheduleAction(IAsyncStateMachineBox box, Boolean allowInlining)
         at System.Threading.Tasks.Task.RunContinuations(Object continuationObject)
         at System.Threading.Tasks.Task`1.TrySetResult(TResult result)
         at System.Runtime.CompilerServices.AsyncTaskMethodBuilder`1.SetExistingTaskResult(Task`1 task, TResult result)
         at System.Runtime.CompilerServices.AsyncTaskMethodBuilder.SetResult()
         at Microsoft.AspNetCore.Server.Kestrel.Core.Internal.HttpConnection.ProcessRequestsAsync[TContext](IHttpApplication`1 httpApplication)
         at System.Runtime.CompilerServices.AsyncTaskMethodBuilder`1.AsyncStateMachineBox`1.ExecutionContextCallback(Object s)
         at System.Threading.ExecutionContext.RunInternal(ExecutionContext executionContext, ContextCallback callback, Object state)
         at System.Runtime.CompilerServices.AsyncTaskMethodBuilder`1.AsyncStateMachineBox`1.MoveNext(Thread threadPoolThread)
         at System.Runtime.CompilerServices.AsyncTaskMethodBuilder`1.AsyncStateMachineBox`1.MoveNext()
         at System.Threading.Tasks.AwaitTaskContinuation.RunOrScheduleAction(IAsyncStateMachineBox box, Boolean allowInlining)
         at System.Threading.Tasks.Task.RunContinuations(Object continuationObject)
         at System.Threading.Tasks.Task`1.TrySetResult(TResult result)
         at System.Runtime.CompilerServices.AsyncTaskMethodBuilder`1.SetExistingTaskResult(Task`1 task, TResult result)
         at System.Runtime.CompilerServices.AsyncTaskMethodBuilder.SetResult()
         at Microsoft.AspNetCore.Server.Kestrel.Core.Internal.Http2.Http2Connection.ProcessRequestsAsync[TContext](IHttpApplication`1 application)
         at System.Threading.ExecutionContext.RunInternal(ExecutionContext executionContext, ContextCallback callback, Object state)
         at System.Runtime.CompilerServices.AsyncTaskMethodBuilder`1.AsyncStateMachineBox`1.MoveNext(Thread threadPoolThread)
         at System.Runtime.CompilerServices.AsyncTaskMethodBuilder`1.AsyncStateMachineBox`1.MoveNext()
         at System.Threading.Tasks.AwaitTaskContinuation.RunOrScheduleAction(IAsyncStateMachineBox box, Boolean allowInlining)
         at System.Threading.Tasks.Task.RunContinuations(Object continuationObject)
         at System.Threading.Tasks.Task`1.TrySetResult(TResult result)
         at System.Threading.Tasks.UnwrapPromise`1.TrySetFromTask(Task task, Boolean lookForOce)
         at System.Threading.Tasks.UnwrapPromise`1.Invoke(Task completingTask)
         at System.Threading.Tasks.Task.RunContinuations(Object continuationObject)
         at System.Threading.Tasks.Task`1.TrySetResult(TResult result)
         at System.Runtime.CompilerServices.AsyncTaskMethodBuilder`1.SetExistingTaskResult(Task`1 task, TResult result)
         at System.Runtime.CompilerServices.AsyncTaskMethodBuilder.SetResult()
         at Microsoft.AspNetCore.Server.Kestrel.Core.Internal.Http2.Http2FrameWriter.WriteToOutputPipe()
         at System.Runtime.CompilerServices.AsyncTaskMethodBuilder`1.AsyncStateMachineBox`1.ExecutionContextCallback(Object s)
         at System.Threading.ExecutionContext.RunInternal(ExecutionContext executionContext, ContextCallback callback, Object state)
         at System.Runtime.CompilerServices.AsyncTaskMethodBuilder`1.AsyncStateMachineBox`1.MoveNext(Thread threadPoolThread)
         at System.Runtime.CompilerServices.AsyncTaskMethodBuilder`1.AsyncStateMachineBox`1.MoveNext()
         at System.Threading.ThreadPool.<>c.<.cctor>b__52_0(Object state)
         at System.Threading.ThreadPoolWorkQueue.Dispatch()
         at System.Threading.PortableThreadPool.WorkerThread.WorkerThreadStart()
         at System.Threading.Thread.StartCallback()
      --- End of stack trace from previous location ---
         at System.Net.Security.SslStream.WriteAsyncInternal[TIOAdapter](ReadOnlyMemory`1 buffer, CancellationToken cancellationToken)
         at System.IO.Pipelines.StreamPipeWriter.FlushAsyncInternal(Boolean writeToStream, ReadOnlyMemory`1 data, CancellationToken cancellationToken)
         at System.Runtime.CompilerServices.PoolingAsyncValueTaskMethodBuilder`1.StateMachineBox`1.System.Threading.Tasks.Sources.IValueTaskSource<TResult>.GetResult(Int16 token)
         at System.IO.Pipelines.StreamPipeWriter.CompleteAsync(Exception exception)
         at System.IO.Pipelines.StreamPipeWriter.CompleteAsync(Exception exception)
         at Microsoft.AspNetCore.Server.Kestrel.Core.Internal.DuplexPipeStreamAdapter`1.DisposeAsync()
         at Microsoft.AspNetCore.Server.Kestrel.Https.Internal.HttpsConnectionMiddleware.OnConnectionAsync(ConnectionContext context)
         at Microsoft.AspNetCore.Server.Kestrel.Https.Internal.HttpsConnectionMiddleware.OnConnectionAsync(ConnectionContext context)
         at Microsoft.AspNetCore.Server.Kestrel.Core.Internal.Infrastructure.KestrelConnection`1.ExecuteAsync()

