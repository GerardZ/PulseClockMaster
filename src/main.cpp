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
char lastMessage[200];
uint8_t DstPauseTime = 0;  // this is the number of minutes that should be skipped if we come from DST
uint8_t DstExtraTime = 0;    // this holds the number of minutes that should be added when we go to DST

void toggleClockPin(int minute)
{
  if (DstPauseTime){     // we come from DST, hold for 1 hour
    DstPauseTime--;      // keep count
    return;
  }
  
  ClockPinState = (minute & 1);   // clockpulse polarity is in sync with minute, this way we always have same polarity so we never need to alter polarity on the clock itself once it is correct.
  pinMode(CLOCKPIN, OUTPUT);
  digitalWrite(CLOCKPIN, ClockPinState);
}

void toggleDSTClockpin(){   // this is used when going to DST, remember we need to call this twice in one minute to keep in sync with normal minute toggle. So call it on 20 & 40st second.
  ClockPinState = !ClockPinState;
  pinMode(CLOCKPIN, OUTPUT);
  digitalWrite(CLOCKPIN, ClockPinState);
}

void sendUpdateToCLients(const struct tm *tm)
{
  sprintf(lastMessage, R"({"year":%d, "month":%d, "mday":%d, "wday":%d, "DST":%d, "time": "%2d:%02d:%02d", "pulse": %d})", tm->tm_year - 100, tm->tm_mon + 1, tm->tm_mday, tm->tm_wday, tm->tm_isdst, tm->tm_hour, tm->tm_min, tm->tm_sec, ClockPinState);
  WsSendMessage(lastMessage);
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

    // handle to DST, we do 60 extra pulses on :20 and :40 second after DST has become active
    // note that we toggle twice in a minute to keep in sync with normal minute pulse.
    if ((tm->tm_sec == 20 or tm->tm_sec == 40) and !DstExtraTime){
      toggleDSTClockpin();
      DstExtraTime--;                                                // track count
    }
}

void handleHour(const struct tm *tm)
{
  // check here whether DST has changed
  if (previousDST != tm->tm_isdst)
  {
    // we have a change, beware of startup....
    previousDST = tm->tm_isdst;
    if (tm->tm_isdst)   // we go into DST, add one hour
    {
      // we switched to DST, we need to let the clock 1 hour extra
      DstExtraTime = 59;
    }
    else
    {
      // we switched from DST to normal, we need to let the clock pause for one hour...
      DstPauseTime = 59;
    }
  }
}

void HandleWsMessage(uint8_t *message, size_t len, AsyncWebSocketClient *client)
{
  // gets called when there is an incoming websockets message.
}

void HandleNewWsClient(AsyncWebSocketClient *client)
{
  // new client...
  IPAddress remoteIp = client->remoteIP();
  WsSendMessage(lastMessage, client->id());
}


void waitForTimeSync() {
  time_t now = time(nullptr);
  int retries = 0;
  while (now < 8 * 3600 * 2 && retries < 20) { // roughly checks if time is before year ~2000
    delay(500);
    Serial.print("#");
    now = time(nullptr);
    retries++;
  }

  if (now < 8 * 3600 * 2) {
    Serial.println("\nFailed to sync time.");
  } else {
    Serial.println("\nTime synced.");
  }
}

void initDST(){
  time_t now;
  struct tm tm_now;

    time(&now);
    localtime_r(&now, &tm_now);
    previousDST = tm_now.tm_isdst;
}

void setup()
{
  delay(2000);
  Serial.begin(74880);
  Serial.println("Boot OK");
  delay(2000);
  portal.begin();
  // we now have wifi...

  Serial.println("Wifi connected...");

  portal.SetupNtp();

  AsyncWebServer *server = SetupWebserver();
  SetupWebSockets(server, HandleWsMessage, HandleNewWsClient);

  waitForTimeSync();  // we need a synced time for initDST
  initDST();          // we need to set this at startup, otherwise clock will start weird when DST is true.

  TimeService_Init(handleSecond, handleMinute, nullptr, nullptr);
}

void loop()
{
  perfCount++;
  TimeService_Tick();
  delay(1);
}
