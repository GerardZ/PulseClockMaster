
class WebSocketHandler {
    constructor(options = {}) { this.ws = null; this.onConnectionStateChange = options.onConnectionStateChange || function () { }; this.onMessageReceived = options.onMessageReceived || function () { }; this.timeoutLength = options.timeoutLength || 62000; this.checkInterval = options.checkInterval || 1500; this.wsPath = options.path || "ws"; if (location.host.startsWith('127.0.0') && options.debugUrl) this.wsUrl = options.debugUrl; else this.wsUrl = this.IsSSL() ? "wss://" : "ws://" + location.host + "/" + this.wsPath; console.log("Connecting to: " + this.wsUrl); this.lastActivity = Date.now(); this.heartbeatTimer = null; this.connect(); }
    connect() { this.ws = new WebSocket(this.wsUrl); this.ws.binaryType = "arraybuffer"; this._setConnectionState("connecting"); this.ws.onopen = () => { this._setConnectionState("connected"); this.lastActivity = Date.now(); this._startHeartbeat(); }; this.ws.onmessage = (event) => { this.lastActivity = Date.now(); this.onMessageReceived(event.data); }; this.ws.onerror = (error) => { console.error("WebSocket error:", error); }; this.ws.onclose = () => { this._setConnectionState("disconnected"); this._stopHeartbeat(); setTimeout(() => { console.warn("Attempting to reconnect WebSocket..."); this.connect(); }, this.checkInterval); }; }
    send(data) { if (this.ws && this.ws.readyState === WebSocket.OPEN) { this.ws.send(data); this.lastActivity = Date.now(); } else { console.warn("WebSocket not open. Cannot send:", data); } }
    _setConnectionState(state) { this.connectionState = state; this.onConnectionStateChange(state); }
    _startHeartbeat() { this._stopHeartbeat(); this.heartbeatTimer = setInterval(() => { const now = Date.now(); if (now - this.lastActivity > this.timeoutLength) { console.warn("WebSocket inactive for too long. Closing."); this.ws.close(); } }, this.checkInterval); }
    _stopHeartbeat() { if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; } }
    close() { this._stopHeartbeat(); if (this.ws) { this.ws.close(); this.ws = null; } }
    setOnMessageReceived(callback) { this.onMessageReceived = callback; }
    setOnConnectionStateChange(callback) { this.onConnectionStateChange = callback; }
    setTimeoutLength(ms) { this.timeoutLength = ms; }
    setCheckInterval(ms) { this.checkInterval = ms; if (this.heartbeatTimer) { this._startHeartbeat(); } }
    isBinary(data) { if (typeof data === "string") return false; return true; }
    IsSSL() { if (document.location.protocol == 'https:') return true; return false }
}


globalThis.svgNS = "http://www.w3.org/2000/svg"; class SegmentDisplay {
    static nextId = 0; static minusSignShape = "0,8 6,8 6,10 0,10"; static SEGMENT_SHAPES = { a: "1,1 2,0 8,0 9,1 8,2 2,2", b: "9,1 10,2 10,8 9,9 8,8 8,2", c: "9,9 10,10 10,16 9,17 8,16 8,10", d: "9,17 8,18 2,18 1,17 2,16 8,16", e: "1,17 0,16 0,10 1,9 2,10 2,16", f: "1,9 0,8 0,2 1,1 2,2 2,8", g: "1,9 2,8 8,8 9,9 8,10 2,10", dot: "circle" }; static DIGIT_SEGMENTS = { "0": ["a", "b", "c", "d", "e", "f"], "1": ["b", "c"], "2": ["a", "b", "g", "e", "d"], "3": ["a", "b", "c", "d", "g"], "4": ["f", "g", "b", "c"], "5": ["a", "f", "g", "c", "d"], "6": ["a", "f", "e", "d", "c", "g"], "7": ["a", "b", "c"], "8": ["a", "b", "c", "d", "e", "f", "g"], "9": ["a", "b", "c", "d", "f", "g"], "-": ["g"], " ": [], "A": ["a", "b", "c", "e", "f", "g"], "B": ["f", "e", "d", "c", "g"], "C": ["a", "f", "e", "d"], "D": ["b", "c", "d", "e", "g"], "E": ["a", "f", "e", "d", "g"], "F": ["a", "f", "e", "g"] }; constructor(parentId, digits = 4, scale = 1, bgColor = "#422", fgColor = "red") {
        this.digitWidth = 12; this.clockSeparatorWidth = 8; this.digitHeight = 20; this.defXOffset = 2; this.defYOffset = 1; this.numberOfDigits = this.cleanNumberString(this.numberToString(digits)).length; this.isClockDisplay = false; this.hasMinusSign = false; this.bgColor = bgColor
        this.fgColor = fgColor; this.parent = document.getElementById(parentId); this.scale = scale; this.width = this.digitCount * this.digitWidth * scale; if (this.isClockDisplay == true) { this.width += this.clockSeparatorWidth * scale; }
        this.height = this.digitHeight * scale; this.instanceId = SegmentDisplay.nextId++; this.wrapperId = `display-wrapper-${this.instanceId}`; this.containerId = `display-${this.instanceId}`; this.displayWrapperContainer = "width: fit-content; height: fit-content; padding-left: 4px; padding-right: 2px;"; this.displayWrapper = "transform-origin: top left;"; this.digitContainerClass = "display: flex;"
        this.displayWrapperContainer = "width: fit-content;"; this.digit = ""; this.segment = "opacity: 0.1;"
        this.on = "opacity: 1;"; const style = document.createElement('style'); style.textContent = `.segment{opacity:0.1;}.segOn{opacity:1;}.clockDot{ }.minusSign{ }`; document.head.appendChild(style); this.createDisplaySvg(this.parent, digits);
    }
    numberToString(num) {
        if (typeof num === "number") { return ''.padStart(num, '0'); }
        return num;
    }
    alignToRight(numStr) { return numStr.padStart(this.numberOfDigits, ' '); }
    createDisplaySvg(parent, format) {
        const svg = document.createElementNS(svgNS, "svg"); 
        svg.setAttribute("viewBox", `0 0 ${this.width / this.scale}${this.height / this.scale}`);
        
        
        svg.style.background = this.bgColor; if (typeof format === "number") { format = '0'.repeat(format); }
        var i = 0; var offset = this.defXOffset
        for (const char of format) {
            if (!isNaN(char)) { offset += this.createDigitGroup(svg, offset, i); i++; }
            else if (char === ":") { offset += this.createClockSeparator(svg, offset); }
            else if (char === "-") { offset += this.createMinusSign(svg, offset); }
        }
        svg.setAttribute("viewBox", `0 0 ${offset}${this.height / this.scale}`); 
        parent.appendChild(svg);
    }
    createMinusSign(ParentSvg, offset) { const group = document.createElementNS(svgNS, "g"); group.setAttribute("transform", `skewX(-3)translate(${offset},${this.defYOffset})`); group.setAttribute("style", `fill-rule:evenodd;stroke:${this.bgColor};stroke-width:0.5;stroke-opacity:1;stroke-linecap:butt;stroke-linejoin:miter;`); const minusSign = document.createElementNS(svgNS, "polygon"); minusSign.setAttribute("points", SegmentDisplay.minusSignShape); minusSign.classList.add("minusSign"); minusSign.classList.add("segment"); minusSign.setAttribute("fill", this.fgColor); group.appendChild(minusSign); ParentSvg.appendChild(group); this.hasMinusSign = true; return 7; }
    createClockSeparator(ParentSvg, offset) {
        const group = document.createElementNS(svgNS, "g"); group.setAttribute("transform", "skewX(-3)"); group.setAttribute("transform", `skewX(-3)translate(${offset},${this.defYOffset})`); group.setAttribute("style", `fill-rule:evenodd;stroke:${this.bgColor};stroke-width:0.5;stroke-opacity:1;stroke-linecap:butt;stroke-linejoin:miter;`); for (let i = 0; i < 2; i++) { const dot = document.createElementNS(svgNS, "circle"); dot.setAttribute("cx", 2); dot.setAttribute("cy", this.defYOffset + 4 + i * 8); dot.setAttribute("r", 1.2); dot.classList.add("clockDot"); dot.classList.add("segment"); dot.setAttribute("fill", this.fgColor); group.appendChild(dot); }
        ParentSvg.appendChild(group); return 5;
    }
    createDigitGroup(ParentSvg, offset, id) {
        const group = document.createElementNS(svgNS, "g"); group.setAttribute("transform", `skewX(-3)translate(${offset},${this.defYOffset})`); group.setAttribute("style", `fill-rule:evenodd;stroke:${this.bgColor};stroke-width:0.5;stroke-opacity:1;stroke-linecap:butt;stroke-linejoin:miter;`); for (const [name, points] of Object.entries(SegmentDisplay.SEGMENT_SHAPES)) {
            let shape; if (name === "dot") { shape = document.createElementNS(svgNS, "circle"); shape.setAttribute("cx", 11); shape.setAttribute("cy", 17); shape.setAttribute("r", 1); } else { shape = document.createElementNS(svgNS, "polygon"); shape.setAttribute("points", points); }
            shape.setAttribute("id", `digit-${this.containerId}-${id}-seg-${name}`); shape.setAttribute("class", "segment"); shape.setAttribute("fill", this.fgColor); group.appendChild(shape);
        }
        ParentSvg.appendChild(group); return this.digitWidth;
    }
    setDigit(index, value, showDot = false) { const onSegments = SegmentDisplay.DIGIT_SEGMENTS[value] || []; const allSegs = Object.keys(SegmentDisplay.SEGMENT_SHAPES); for (const seg of allSegs) { const el = document.getElementById(`digit-${this.containerId}-${index}-seg-${seg}`); if (!el) continue; const isOn = seg === "dot" ? showDot : onSegments.includes(seg); el.classList.toggle("segOn", isOn); } }
    setClockDots(state) { const dotElements = this.parent.querySelectorAll(".clockDot"); dotElements.forEach(dot => { dot.classList.toggle("segOn", state); }); }
    setMinusSign(state) { const dotElements = this.parent.querySelectorAll(".minusSign"); dotElements.forEach(dot => { dot.classList.toggle("segOn", state); }); }
    cleanNumberString(numStr) { return numStr.toUpperCase().replace(/[^0-9A-F]/g, ""); }
    displayNumber(numStr, dots = []) { const cleanedAndAligned = this.alignToRight(this.cleanNumberString(numStr));[...cleanedAndAligned].forEach((char, idx) => { const showDot = Array.isArray(dots) ? dots[idx] : false; this.setDigit(idx, char, showDot); }); }
}
