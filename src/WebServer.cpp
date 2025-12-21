#include "WebServer.h"

AsyncWebServer server(80);

String getContentType(String filename)
{
  if (filename.endsWith(".htm"))
    return "text/html";
  else if (filename.endsWith(".html"))
    return "text/html";
  else if (filename.endsWith(".css"))
    return "text/css";
  else if (filename.endsWith(".js"))
    return "application/javascript";
  else if (filename.endsWith(".png"))
    return "image/png";
  else if (filename.endsWith(".gif"))
    return "image/gif";
  else if (filename.endsWith(".jpg"))
    return "image/jpeg";
  else if (filename.endsWith(".ico"))
    return "image/x-icon";
  else if (filename.endsWith(".xml"))
    return "text/xml";
  else if (filename.endsWith(".pdf"))
    return "application/x-pdf";
  else if (filename.endsWith(".zip"))
    return "application/x-zip";
  else if (filename.endsWith(".gz"))
    return "application/x-gzip";
  return "text/plain";
}

void AddCrossOriginHeaders()
{
  DefaultHeaders::Instance().addHeader("Access-Control-Allow-Origin", "*");
  DefaultHeaders::Instance().addHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  DefaultHeaders::Instance().addHeader("Access-Control-Allow-Headers", "Content-Type");
}

// serve Get from ProgMem
template <size_t N>
void serveOnGet(const char *route, const uint8_t (&content)[N], String contentType = "text/html", bool GzipContent = false)
{
  server.on(route, HTTP_GET, [GzipContent, contentType, &content](AsyncWebServerRequest *request)
            {
      AsyncWebServerResponse *response;
      response = request->beginResponse_P(200, contentType, content, N);
      if (GzipContent) response->addHeader("Content-Encoding", "gzip");
      request->send(response); });
}

AsyncWebServer *SetupWebserver()
{
  AddCrossOriginHeaders();

  serveOnGet("/", index_html_gz, "text/html", GZippedContent);
  serveOnGet("/favicon.ico", favicon_ico, "application/octet-stream");

  
  server.onNotFound([](AsyncWebServerRequest *request)
                    {
  String path = request->url();
  if (LittleFS.exists(path)) {
    String contentType = getContentType(path);
    request->send(LittleFS, path, contentType);
  } else {
    request->send(404, "text/plain", "File Not Found");
  } });

  server.begin();

  return &server;
}
