/*

WiFiPortal

A very simple WiFiPortal using asyncwebserver

Tries to connect to WiFi with EEPROM stored credentials. If connection fails, it will start Wifi station "ESP_Device" or the name you give it.
Connect to this station, pw 12345678 and then open any website. You will be presented a small webpage where you can enter your WiFi credentials.
Store it, the device will reboot and tries again to connect, this time with your credentials.


USES:
    - 96 bytes EEPROM !


USAGE:
    #include "WifiPortal.h"

    WiFiPortal portal("ESP_Device");

    void setup() {
    portal.begin();
    // here we have wifi...
    }

    void handleReset(){
        portal.clearWifiCredentials();      // this will clear the WiFi credentials and reboot
    }


BONUS:

Since we are handling Wifi here, there are also some functions that might be handy here:
    IPAddress GetBroadcastAddress();
    IPAddress DnsLookup(const char *host);
    IPAddress GetIpAddress();
    void SetupNtp(const char *TimeZoneString = "CET-1CEST,M3.5.0/02,M10.5.0/03", const char *NtpServer = "pool.ntp.org");

*/


#ifndef WIFIPORTAL_H
#define WIFIPORTAL_H

#include <ESP8266WiFi.h>
#include <ESPAsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <DNSServer.h>
#include <EEPROM.h>

#define EEPROM_SIZE 96
#define SSID_ADDR 0
#define PASS_ADDR 32
#define FLAG_ADDR 95

class WiFiPortal {
  public:
    WiFiPortal(const String& deviceName = "ESP_Device");
    void begin();
    bool isWiFiConnected();
    void clearWifiCredentials();
    IPAddress GetBroadcastAddress();
    IPAddress DnsLookup(const char *host);
    IPAddress GetIpAddress();
    void SetupNtp(const char *TimeZoneString = "CET-1CEST,M3.5.0/02,M10.5.0/03", const char *NtpServer = "pool.ntp.org");

  private:
    const char* ap_ssid = "ESP_Config";
    const char* ap_password = "12345678";
    const byte DNS_PORT = 53;

    DNSServer dnsServer;
    AsyncWebServer server;
    String deviceName;

    void startCaptivePortal();
    void handleRoot(AsyncWebServerRequest *request);
    void handleSubmit(AsyncWebServerRequest *request);
    void loadCredentials(String &ssid, String &pass);
    void saveCredentials(const String &ssid, const String &pass);
    
};

#endif
