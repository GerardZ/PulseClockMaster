

// REMOVE This will be removed by CompressHTML.py and is for debugging purposes
/* this is for debugging through live server in VsCode, so you dont have to program the ESP on every change of this
   file but rather use it through live server but then connecting websockets to the esp.
   This works by pointing the server address to a different IP since the liveServer plugin will serve the html page
   from localhost 127.0.0.1,
   See further on in function InitWs

*/
EspHost = '192.168.0.160';           // Set this to you ESP address for debugging
// ENDREMOVE

var socket;
var settings;

document.addEventListener("DOMContentLoaded", function () {
    InitWs();
});

function sendJsonValue(id, value) {
    sendWs(`{"${id}":"${value}"}`);
}

function SendJsonValueOnReturn(event, id, value) {
    if (event.key !== "Enter") { return }
    sendJsonValue(id, value);
}

var prevDimValue;           // we want only changes to be sent to the host, so store value to compare if changed
function doSlider(slider) {
    if (prevDimValue !== slider.value) {
        sendJsonValue("dim", slider.value);
        prevDimValue = slider.value;
    }
}

function InitWs() {
    host = location.host;

    // REMOVE This will be removed by CompressHTML.py and is for debugging purposes
    /* this is for debugging through live server in VsCode, so you dont have to program the ESP on every change of this
       file but rather use it through live server but then connecting websockets to the esp.
       This works by pointing the server address to a different IP since the liveServer plugin will serve the html page
       from localhost 127.0.0.1
    */

    if (location.host.startsWith('127.0.0')) { host = EspHost; }
    console.log("Host is: " + host);
    // ENDREMOVE

    socket = new WebSocket(SecureOrNotWs() + host + '/ws');
    socket.onopen = onOpen;
    socket.onclose = onClose;
    socket.onmessage = onMessage;
}

function SecureOrNotWs() {  // when serving behind an ssl offloaded proxy...
    if (document.location.protocol == 'https:') return "wss://";
    return "ws://";
}

function sendWs(message) {
    socket.send(message);
}

function onOpen(event) {
    console.log('Connection opened');
}

function onClose(event) {
    console.log('Connection closed');
    console.log('Close code:', event.code);
    console.log('Close reason:', event.reason);
    console.log('Was the connection clean?', event.wasClean);

    setTimeout(InitWs, 2000);
}

//----------------- so far websockets

function checkBit(byte, position) {
    const mask = 1 << position;
    return (byte & mask) !== 0;  // Returns true if the bit is 1, false if it's 0
}


let LedOnColor;
const LedOn = "#F33";
const LedOff = "#311"
function setDot(id, state) {     // set a dot in the display svg by its id to on or off, can also be used for other svg elements having a fill-attribute
    document.getElementById(id).setAttribute("fill", state ? LedOnColor : LedOff);
}

function toTwoDigitHex(number) {
    return number.toString(16).padStart(1, '0').toUpperCase();
}

function setDimColor(dimValue) {
    dim = 0.5 + dimValue * .5 / 16;
    const c1 = parseInt(LedOff.slice(1), 16);
    const c2 = parseInt(LedOn.slice(1), 16);

    const r1 = (c1 >> 8) & 0xf;
    const g1 = (c1 >> 4) & 0xf;
    const b1 = c1 & 0xf;

    const r2 = (c2 >> 8) & 0xf;
    const g2 = (c2 >> 4) & 0xf;
    const b2 = c2 & 0xf;

    const r = Math.round(r1 + (r2 - r1) * dim);
    const g = Math.round(g1 + (g2 - g1) * dim);
    const b = Math.round(b1 + (b2 - b1) * dim);

    LedOnColor = `#${toTwoDigitHex(r)}${toTwoDigitHex(g)}${toTwoDigitHex(b)}`;
    //console.debug(`${LedOnColor} ${r1} ${g1} ${b1} ${r2} ${g2} ${b2}`);
}

function handleBinBlob(blobData) {
    // BlobData contains state of display here, we have per display 8x8 bits, so 8 bytes. 
    // The struct in the library (deviceInfo_t) also has a bool changed @position 9 (1 byte).
    // And there are 4 displays, so we have 9 bytes data per display, total 36bytes.
    const reader = new FileReader();
    reader.onload = function (event) {
        const arrayBuffer = event.target.result;                // This is the ArrayBuffer representation of the Blob

        const byteArray = new Uint8Array(arrayBuffer);          // Create a Uint8Array to access the bytes of the ArrayBuffer

        for (let disp = 0; disp < 4; disp++) {                  // scan all 8x8 displays
            for (let byte = 0; byte < 8; byte++)                // scan all 8bit rows
                for (let bit = 0; bit < 8; bit++) {             // scan all bits in that row
                    let row = byte;
                    let col = bit;
                    setDot(`dot${3 - disp}${7 - row}${7 - col}`, checkBit(byteArray[byte + (disp * 9)], bit));
                }
        }
    }
    reader.readAsArrayBuffer(blobData);
}

async function onMessage(event) {
    if (event.data instanceof Blob) {
        //console.log("Received a binary message (Blob).");
        handleBinBlob(event.data);
        return;
    } else if (event.data instanceof ArrayBuffer) {
        //console.log("Received a binary message (ArrayBuffer).");
    }
    ParseJson(event.data);
}

function isRadioButton(element) {
    return element.tagName === 'INPUT' && element.type === 'radio';
}

function ParseJson(jsonString) {
    try {
        var jsonObject = JSON.parse(jsonString);
    }
    catch {
        //console.debug(jsonString);
        return;
    }
    //console.debug(jsonObject);

    if (Object.hasOwn(jsonObject, 'dimValue')) {
        setDimColor(jsonObject.dimValue);
    }

    if (Object.hasOwn(jsonObject, 'perf')) {
        handlePerf(jsonObject.perf);
    }

    // loop through data here...
    for (const [key, value] of Object.entries(jsonObject)) {
        if (jsonObject.hasOwnProperty(key)) {
            object = document.getElementById(key)
            if (object) {
                object.value = jsonObject[key];
            }
        }
        if (key === 'mode') {
            object = document.getElementById(value) // radio buttons, always someting else...
            if (object && isRadioButton(object)) {
                object.checked = true;
            }
        }
    }
}

function handlePerf(value) {
    let width = 80 * (1000 - value) / 1000;
    document.getElementById("perfBar").setAttribute("width", width);
}
