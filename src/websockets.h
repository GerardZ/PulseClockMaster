#pragma once

#include <Arduino.h>

#include <ESPAsyncTCP.h>
#include <ESPAsyncWebServer.h>

typedef void (*WsCallback)(void);

struct WsStatus{
    uint8_t maxWsClients = 6;       // 13 crashes a 8266, of course this is resource dependant.
    uint8_t currentNumClients = 0;
};

inline WsStatus wsStatus;


void SetNewClientCallBack(WsCallback callback);
void SetupWebSockets(AsyncWebServer *server, void (*WsMsgRevdCallback)(uint8_t*, size_t, AsyncWebSocketClient*), void (*WsConnectCallback)(AsyncWebSocketClient*) = 0);
void WsSendMessage(char *message, uint32_t clientId = 0);

