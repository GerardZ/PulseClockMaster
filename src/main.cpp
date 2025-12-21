#include "WifiPortalAndNetwork.h"
#include "timeService.h"
#include "WebServer.h"
#include "websockets.h"


/*

TODO:   DST pause /  run double fast for one hour

*/


#define CLOCKPIN 2

WiFiPortal portal("PulseClockMaster");

uint16_t perfCount;
bool previousDST;
bool ClockPinState;

void toggleClockPin(int minute)
{
  ClockPinState = (minute & 1);
  pinMode(CLOCKPIN, OUTPUT);
  digitalWrite(CLOCKPIN, ClockPinState);
}

void sendUpdateToCLients(const struct tm *tm)
{
  char message[200];
  sprintf(message, R"({"year":%d, "month":%d, "mday":%d, "wday":%d, "DST":%d, "time": "%2d:%02d:%02d", "pulse": %d})", tm->tm_year - 100, tm->tm_mon + 1, tm->tm_mday, tm->tm_wday, tm->tm_isdst, tm->tm_hour, tm->tm_min, tm->tm_sec, ClockPinState);
  WsSendMessage(message);
}

void handleMinute(const struct tm *tm)
{
  toggleClockPin(tm->tm_min);
  sendUpdateToCLients(tm);
  Serial.printf("Time: %2d:%02d:%02d\n", tm->tm_hour, tm->tm_min, tm->tm_sec);
}

void handleSecond(const struct tm *tm)
{
    sendUpdateToCLients(tm);
}

void handleHour(const struct tm *tm)
{
  // check here whether DST has changed
  if (previousDST != tm->tm_isdst)
  {
    // we have a change, beware of startup....
    previousDST = tm->tm_isdst;
    if (previousDST)
    {
      // we switched to DST, we need to let the clock 1 hour extra
    }
    else
    {
      // we switched from DST to normal, we need to let the clock pause for one hour...
    }
  }
}

void HandleWsMessage(uint8_t *message, size_t len, AsyncWebSocketClient *client)
{
}

void HandleNewWsClient(AsyncWebSocketClient *client)
{
  // new client...
  IPAddress remoteIp = client->remoteIP();
}

void setup()
{
  Serial.begin(115200);
  portal.begin();
  // we now have wifi...

  Serial.println("Wifi connected...");

  portal.SetupNtp();

  AsyncWebServer *server = SetupWebserver();
  SetupWebSockets(server, HandleWsMessage, HandleNewWsClient);

  TimeService_Init(handleSecond, handleMinute, nullptr, nullptr);
}

void loop()
{
  perfCount++;
  TimeService_Tick();
  delay(1);
}
