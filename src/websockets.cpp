#include "websockets.h"

/* fixme:

    - max number clients
    - auto clientCleanup
    - callback for client disconnect



*/

AsyncWebSocket ws("/ws");

static WsCallback newClientCallback = NULL;

void (*_WsMsgRevdCallback)(uint8_t *, size_t, AsyncWebSocketClient *); // holds messagereceived callback
void (*_WsConnectCallback)(AsyncWebSocketClient *);                    // holds new client callback

uint8_t *msg_buffer;    // pointer to dynamicly allocated buffer.
uint16_t msg_index = 0; // message index to keep track of multipart message

void SetNewClientCallBack(WsCallback callback){
    newClientCallback = callback;
}

void WsSendMessage(char *message, uint32_t clientId)
{
    if (ws.count() == 0)
        return;

    if (clientId == 0)
        ws.textAll(message);
    else
        ws.text(clientId, message);
}

void WsSendBinMessage(void *data, size_t size)
{
    if (ws.count() == 0)
        return;

    // void AsyncWebSocket::binaryAll(const char * message, size_t len){
    ws.binaryAll(static_cast<const char *>(data), size);
}

void onEvent(AsyncWebSocket *server,
             AsyncWebSocketClient *client,
             AwsEventType type,
             void *arg,
             uint8_t *data,
             size_t len)
{
    AwsFrameInfo *info = (AwsFrameInfo *)arg;

    char WsMessage[140];

    switch (type)
    {
    case WS_EVT_CONNECT:
        wsStatus.currentNumClients++;
        if (wsStatus.currentNumClients > wsStatus.maxWsClients)
        {
            // Refuse the WebSocket connection, limit number of clients !!! @13 the esp crashes
            sprintf(WsMessage, "WebSocket client #%u connected from %s was refused, too many clients.\n", client->id(), client->remoteIP().toString().c_str());
            // iLog(WARN, WsMessage);
            client->close(1000, "Connection refused: Too many connections.");
        }
        else
        {
            if (_WsConnectCallback)
                _WsConnectCallback(client);
            sprintf(WsMessage, "WebSocket client #%u connected from %s, we have %d total clients of max: %d clients. FreeHeap: %dbytes\n", client->id(), client->remoteIP().toString().c_str(), wsStatus.currentNumClients, wsStatus.maxWsClients, ESP.getFreeHeap());

            if (newClientCallback) newClientCallback();

            // iLog(NOTICE, WsMessage);
        }
        break;

    case WS_EVT_DISCONNECT:
        wsStatus.currentNumClients--;
        sprintf(WsMessage, "WebSocket client #%u disconnected, we have %d total clients.\n", client->id(), wsStatus.currentNumClients);
        // iLog(NOTICE, WsMessage);
        break;

    case WS_EVT_DATA:

        if (info->final && info->index == 0 && info->len == len)
        {
            // non-fragmented message
            if (_WsMsgRevdCallback)
            {
                sprintf(WsMessage, "Received unfragmented message of size %d from WebSocket client #%u.", len, client->id());
                // iLog(NOTICE, WsMessage);

                _WsMsgRevdCallback(data, len, client);
            }
        }
        else
        {
            // fragmented, see https://github.com/me-no-dev/ESPAsyncWebServer?tab=readme-ov-file#async-websocket-plugin
            // Serial.println("websocket fragmented packet...");

            if (info->index == 0)
            {                  // apparantly first part of multipart message
                msg_index = 0; // start a zero....
                if (msg_buffer)
                {
                    // iLog(WARN, "New websocket message started from client #%u but buffer was not released by previous !", client->id());
                    delete[] msg_buffer;
                }
                msg_buffer = new uint8_t[info->len];
                if (msg_buffer == nullptr)
                {
                    // iLog(ERROR, "WS onEvent: Could not allocate %ld bytes for multipart WsMessage from client #%u !", info->len, client->id());
                    //  handle error further...
                }

            }
            else
            { // apparently subsequent part of message
              // Serial.printf("Subsequent message...\n");
            }
            // copy to buffer
            for (size_t i = 0; i < len; i++)
            {
                msg_buffer[msg_index] = data[i];
                msg_index++;
            }
            // if(info->final){ // message should be complete...
            if ((info->index + len) == info->len)
            { // complete ?
                msg_buffer[msg_index] = 0;
                _WsMsgRevdCallback(msg_buffer, info->len, client); // callback

                // and cleanup buffer
                delete[] msg_buffer;
                msg_buffer = nullptr;
            }
        }
        break;

    case WS_EVT_PONG:
        break;

    case WS_EVT_ERROR:
        break;
    }
}

void SetupWebSockets(AsyncWebServer *server, void (*WsMsgRevdCallback)(uint8_t *, size_t, AsyncWebSocketClient *), void (*WsConnectCallback)(AsyncWebSocketClient *))
{
    _WsMsgRevdCallback = WsMsgRevdCallback;
    _WsConnectCallback = WsConnectCallback;
    ws.onEvent(onEvent);
    server->addHandler(&ws);
}
