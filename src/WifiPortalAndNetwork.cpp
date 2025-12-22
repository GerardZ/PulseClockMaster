// WiFiPortal.cpp
#include "WifiPortalAndNetwork.h"

WiFiPortal::WiFiPortal(const String &deviceName)
    : server(80), deviceName(deviceName) {}

void WiFiPortal::begin()
{
    EEPROM.begin(EEPROM_SIZE);

    String ssid, pass;
    loadCredentials(ssid, pass);

    WiFi.mode(WIFI_STA);
    WiFi.setHostname(deviceName.c_str());
    WiFi.begin(ssid.c_str(), pass.c_str());

    Serial.print("Connecting to WiFi");
    for (int i = 0; i < 20; i++)
    {
        if (WiFi.status() == WL_CONNECTED)
        {
            Serial.println("\nConnected!");
            Serial.println(WiFi.localIP());
            return;
        }
        delay(500);
        Serial.print(".");
    }

    Serial.println("\nWiFi failed. Starting captive portal...");
    startCaptivePortal();
}

bool WiFiPortal::isWiFiConnected()
{
    return WiFi.status() == WL_CONNECTED;
}

void WiFiPortal::startCaptivePortal()
{
    WiFi.softAP(deviceName.c_str(), ap_password);
    delay(100);
    IPAddress myIP = WiFi.softAPIP();
    dnsServer.start(DNS_PORT, "*", myIP);

    server.on("/", HTTP_GET, std::bind(&WiFiPortal::handleRoot, this, std::placeholders::_1));
    server.on("/submit", HTTP_POST, std::bind(&WiFiPortal::handleSubmit, this, std::placeholders::_1));

    // Note: scan gives problems under softAP !

    server.onNotFound([](AsyncWebServerRequest *request)
                      { request->redirect("/"); });

    server.begin();
    Serial.println("Captive portal started.");

    while (true)
    {
        yield();
    }
}

void WiFiPortal::handleRoot(AsyncWebServerRequest *request)
{
    String html = R"rawliteral(
    <html>
<head>
  <title>)rawliteral" +
                  deviceName + R"rawliteral( WiFi Config</title>
  <style>
    body {
      background-color: #f0f0f0;
      font-family: sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
    }

    .form-container {
      background-color: #fff;
      padding: 20px 30px;
      border-radius: 8px;
      box-shadow: 0 0 10px rgba(0,0,0,0.2);
      text-align: center;
    }

    input[type="text"], input[type="password"] {
      width: 100%;
      padding: 8px;
      margin: 8px 0;
      border: 1px solid #ccc;
      border-radius: 4px;
    }

    input[type="submit"] {
      background-color: #4CAF50;
      color: white;
      padding: 10px 15px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }

    input[type="submit"]:hover {
      background-color: #45a049;
    }
  </style>
</head>
<body>
  <div class="form-container">
  <h2>)rawliteral" +
                  deviceName + R"rawliteral( WiFi Setup</h2>
    <h3>Configure WiFi</h3>
    <form action="/submit" method="POST">
        <input type="text" name="ssid" placeholder="WiFi SSID" required><br>
        <input type="password" name="pass" placeholder="WiFi Password" required><br>
        <input type="submit" value="Save">
    </form>
  </div>
</body>
</html>
    )rawliteral";
    request->send(200, "text/html", html);
}

void WiFiPortal::handleSubmit(AsyncWebServerRequest *request)
{
    if (request->hasParam("ssid", true) && request->hasParam("pass", true))
    {
        String ssid = request->getParam("ssid", true)->value();
        String pass = request->getParam("pass", true)->value();
        saveCredentials(ssid, pass);

        request->send(200, "text/html", "<h2>Saved. Rebooting...</h2>");
        delay(5000);
        ESP.restart();
    }
    else
    {
        request->send(400, "text/plain", "Missing parameters");
    }
}

void WiFiPortal::loadCredentials(String &ssid, String &pass)
{
    char ssidBuf[32], passBuf[32];
    for (int i = 0; i < 32; i++)
    {
        ssidBuf[i] = EEPROM.read(SSID_ADDR + i);
        passBuf[i] = EEPROM.read(PASS_ADDR + i);
    }
    ssidBuf[31] = 0;
    passBuf[31] = 0;
    ssid = String(ssidBuf);
    pass = String(passBuf);
}

void WiFiPortal::saveCredentials(const String &ssid, const String &pass)
{
    for (int i = 0; i < 32; i++)
    {
        EEPROM.write(SSID_ADDR + i, i < ssid.length() ? ssid[i] : 0);
        EEPROM.write(PASS_ADDR + i, i < pass.length() ? pass[i] : 0);
    }
    EEPROM.commit();
}

void WiFiPortal::clearWifiCredentials()
{
    EEPROM.write(SSID_ADDR, 0);
    EEPROM.write(PASS_ADDR, 0);
    EEPROM.commit();
    Serial.println("\nWiFi credentials cleared, rebooting in 5 seconds...");
    delay(5000);
    ESP.restart();
}

IPAddress WiFiPortal::DnsLookup(const char *host)
{
  IPAddress ip;
  if (WiFi.hostByName(host, ip)) {
    Serial.print("DNS Lookup successful. IP Address: ");
    Serial.println(ip);
  } else {
    Serial.println("DNS Lookup failed.");
  }

  return ip;
}

IPAddress WiFiPortal::GetIpAddress()
{
    return WiFi.localIP();
}

IPAddress WiFiPortal::GetBroadcastAddress()
{
  IPAddress broadcastAddress;
  IPAddress wifiIp = WiFi.localIP();
  IPAddress mask = WiFi.subnetMask();

  for (int i = 0; i < 4; i++)
  {
    broadcastAddress[i] = wifiIp[i] | ~mask[i];
  }
  return broadcastAddress;
}

void WiFiPortal::SetupNtp(const char *TimeZoneString, const char *NtpServer)
{
  configTime(TimeZoneString, NtpServer); // --> This is al for NTP to configure...
}
