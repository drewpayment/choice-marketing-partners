using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using api.Data;
using api.Extensions;
using Microsoft.AspNetCore.Http.Json;

var builder = WebApplication.CreateBuilder(args);

// Add Database
var connectionString = builder.Configuration.GetConnectionString("Default");
builder.Services.AddDbContextPool<DataContext>(options => options.UseMySQL(connectionString));

// Add Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Register Service classes to DI
builder.Services.AddServiceDependencies();

// add authentication/authorization

// add controllers
builder.Services.AddControllers()
  .AddJsonOptions(options =>
  {
    options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
  });

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
  app.UseSwagger();
  app.UseSwaggerUI();
}
else
{
  app.UseExceptionHandler("/Error");
  app.UseHsts();
}

app.UseHttpsRedirection();

app.UseAuthorization();
app.MapControllers();

app.Run();
