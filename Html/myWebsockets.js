/*
 
USAGE:

  // websockets...

        const wsHandler = new WebSocketHandler(
            {
                timeoutLength: 70000,
                checkInterval: 5000,
                onConnectionStateChange: (state) => {
                    console.log("Connection state:", state);
                    handleConnectState(state);
                },
                onMessageReceived: (msg) => {
                    console.log("Message:", msg);
                    handleMessage(msg);
                }
                //REMOVE This will be removed by CompressHTML.py and is for debugging through live server in VsCode
                ,debugUrl: "ws://192.168.0.52/ws"
                //ENDREMOVE
            });

        function handleConnectState(state) {
            document.getElementById("connectionState").innerHTML = state;
        }

        function handleMessage(msg) {
            if (isBinary(msg)) {
                handleBinary(msg);
                return;
            }

            handleJson(msg);
        }    
        and so on...
        

        timeoutlength:              time in ms after no activity connection is considered disconnected, default 62000 ms (62 secs...)
        checkinterval:              time in ms when timeout is checked, default 1500 ms
        onConnectionStateChange:    callback that gets called when connectionstate changes, returns state
        onMessageReceived:          callback that gets called when a ws message is received, return msg
        debugUrl:                   direct url to ws server, this will only be used when location.host.startsWith('127.0.0') is true, used for debugging so, you can use i webpage directly wthout being served from the server
 
        */

class WebSocketHandler {
    constructor(options = {}) {
        // connect to serving server
        this.ws = null;

        // Callbacks
        this.onConnectionStateChange = options.onConnectionStateChange || function () { };
        this.onMessageReceived = options.onMessageReceived || function () { };

        // Config
        this.timeoutLength = options.timeoutLength || 5000; // ms 62 seconds, so expecting every 60 seconds activity from server to keep alive
        this.checkInterval = options.checkInterval || 1500;  // ms

        // If needed path can be set
        this.wsPath = options.path || "ws";

        // set a debug host if running from vsCode live server
        if (location.host.startsWith('127.0.0') && options.debugUrl) this.wsUrl = options.debugUrl;
        else this.wsUrl = this.IsSSL() ? "wss://" : "ws://" + location.host + "/" + this.wsPath;

        console.log("Connecting to: " + this.wsUrl);

        // Activity Tracking
        this.lastActivity = Date.now();
        this.heartbeatTimer = null;

        this.connect();
    }

    connect() {
        this.ws = new WebSocket(this.wsUrl);
        this.ws.binaryType = "arraybuffer";
        this._setConnectionState("connecting");

        this.ws.onopen = () => {
            this._setConnectionState("connected");
            this.lastActivity = Date.now();
            this._startHeartbeat();
        };

        this.ws.onmessage = (event) => {
            this.lastActivity = Date.now();
            this.onMessageReceived(event.data);
        };

        this.ws.onerror = (error) => {
            console.error("WebSocket error:", error);
        };

        this.ws.onclose = () => {
            this._setConnectionState("disconnected");
            this._stopHeartbeat();

            // Retry after delay
            setTimeout(() => {
                console.warn("Attempting to reconnect WebSocket...");
                this.connect();
            }, this.checkInterval);  // reuse the existing check interval
        };
    }

    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(data);
            this.lastActivity = Date.now();
        } else {
            console.warn("WebSocket not open. Cannot send:", data);
        }
    }

    _setConnectionState(state) {
        this.connectionState = state;
        this.onConnectionStateChange(state);
    }

    _startHeartbeat() {
        this._stopHeartbeat(); // avoid duplicates
        this.heartbeatTimer = setInterval(() => {
            const now = Date.now();
            if (now - this.lastActivity > this.timeoutLength) {
                console.warn("WebSocket inactive for too long. Closing.");
                this.ws.close();
            }
        }, this.checkInterval);
    }

    _stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    close() {
        this._stopHeartbeat();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    // Allow dynamic update of callbacks and settings
    setOnMessageReceived(callback) {
        this.onMessageReceived = callback;
    }

    setOnConnectionStateChange(callback) {
        this.onConnectionStateChange = callback;
    }

    setTimeoutLength(ms) {
        this.timeoutLength = ms;
    }

    setCheckInterval(ms) {
        this.checkInterval = ms;
        if (this.heartbeatTimer) {
            this._startHeartbeat(); // restart with new interval
        }
    }

    isBinary(data) {
        if (typeof data === "string") return false;
        return true;
    }

    IsSSL() {  // when serving behind an ssl offloaded proxy...
        if (document.location.protocol == 'https:') return true;
        return false
    }


}