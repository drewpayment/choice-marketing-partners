using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using api.Data;
using api.Extensions;
using Microsoft.AspNetCore.Http.Json;

const string useCorsPolicy = "_useCorsWhoCares";

var builder = WebApplication.CreateBuilder(args);

// Add Database
var connectionString = builder.Configuration.GetConnectionString("Default");
builder.Services.AddDbContextPool<DataContext>(options => options.UseMySQL(connectionString));

// Add Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Register Service classes to DI
builder.Services.AddServiceDependencies();

if (builder.Environment.IsDevelopment())
{
  builder.Services.AddCors(options =>
  {
    options.AddPolicy(name: useCorsPolicy,
      builder =>
      {
        builder.AllowAnyOrigin()
          .AllowAnyHeader()
          .AllowAnyMethod();
      });
  });
}

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

  app.UseCors(useCorsPolicy);
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
