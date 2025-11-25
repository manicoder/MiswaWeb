# Use the official .NET 8.0 runtime as the base image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080

# Use the .NET 8.0 SDK image to build the application
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy the project file and restore dependencies
COPY ["MltAdminApi.csproj", "."]
RUN dotnet restore "MltAdminApi.csproj"

# Copy the entire project and build it
COPY . .
RUN dotnet build "MltAdminApi.csproj" -c Release -o /app/build

# Publish the application
FROM build AS publish
RUN dotnet publish "MltAdminApi.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Create the final runtime image
FROM base AS final
WORKDIR /app

# Create directories for logs and uploads (if your app writes there)
RUN mkdir -p /app/logs /app/uploads/labels

# Copy the published application files from publish stage
COPY --from=publish /app/publish .

# Set environment variables for Railway deployment
ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://0.0.0.0:8080
 

# Run the app
ENTRYPOINT ["dotnet", "MltAdminApi.dll"]
