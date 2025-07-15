using GridmateSignalR.Hubs;
using GridmateSignalR.Services;
using Microsoft.AspNetCore.SignalR;

var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = true;
    options.KeepAliveInterval = TimeSpan.FromSeconds(15);
    options.ClientTimeoutInterval = TimeSpan.FromSeconds(30);
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowExcelAddIn", policy =>
    {
        policy.WithOrigins(
            "https://localhost:3000",
            "http://localhost:3000",
            "https://localhost:5001",
            "http://localhost:5000"
        )
        .AllowAnyMethod()
        .AllowAnyHeader()
        .AllowCredentials();
    });
});

// Configure HttpClient for Go backend
builder.Services.AddHttpClient("GoBackend", client =>
{
    client.BaseAddress = new Uri("http://localhost:8080");
    client.DefaultRequestHeaders.Add("Accept", "application/json");
});

builder.Services.AddControllers();

// Add session cleanup service
builder.Services.AddHostedService<SessionCleanupService>();

var app = builder.Build();

// Configure the HTTP request pipeline
app.UseCors("AllowExcelAddIn");

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}

app.UseRouting();

app.MapHub<GridmateHub>("/hub");
app.MapControllers();

// Add endpoint for Go backend to send messages to clients
app.MapPost("/api/forward-to-client", async (
    ForwardToClientRequest request,
    IHubContext<GridmateHub> hubContext) =>
{
    try
    {
        switch (request.Type)
        {
            case "toolRequest":
                await GridmateHub.SendToolRequestToClient(hubContext, request.SessionId, request.Data);
                break;
            case "aiResponse":
                await GridmateHub.SendAIResponseToClient(hubContext, request.SessionId, request.Data);
                break;
            case "workbookDiff":
                // Broadcast to all clients in the workbook group
                var workbookId = request.SessionId; // In this case, SessionId is actually the workbookId
                await hubContext.Clients.Group($"workbook_{workbookId}").SendAsync("workbookDiff", request.Data);
                break;
            default:
                return Results.BadRequest($"Unknown message type: {request.Type}");
        }
        
        return Results.Ok();
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

app.Run("http://localhost:5000");

// Request models
public record ForwardToClientRequest(string SessionId, string Type, object Data);