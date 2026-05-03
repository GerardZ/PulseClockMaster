# This is a mock NTP-server
#
# Used for testing DST changes
#
# Run it, and let the NTP client call this server (override DNS address in your router or let it go straight to this IP)
#
# We have two options:
#   - 1 hour before starting DST sun 29-03-2026 01:00
#   - 1 hour before ending DST   sun 25-10-2026 02:00
#
# script needs to be run priviledged

import socket
import struct
import time
from datetime import datetime, timezone, timedelta

NTP_PORT = 123
NTP_DELTA = 2208988800  # seconds between 1900 and 1970
MOCK_UTC_OFFSET = 2     # simulate DST by adding 2 hours

def current_ntp_time(sock):
    now = datetime.utcnow() + timedelta(hours=MOCK_UTC_OFFSET)
    return int((now - datetime(1900, 1, 1)).total_seconds())

def checkNtpCalls(sock):
    data, addr = sock.recvfrom(48)
    if len(data) < 48:
        return

    transmit_time = current_ntp_time()

    # Build NTP response packet
    response = bytearray(48)
    response[0] = 0b00100100  # LI = 0 (no warning), Version = 4, Mode = 4 (server)
    response[1] = 1           # Stratum (1 = primary reference)
    response[2] = 0           # Poll interval
    response[3] = 0           # Precision

    # Reference Timestamp
    struct.pack_into('!I', response, 16, transmit_time)
    struct.pack_into('!I', response, 20, 0)

    # Originate Timestamp (copy from client)
    response[24:32] = data[40:48]

    # Receive Timestamp
    struct.pack_into('!I', response, 32, transmit_time)
    struct.pack_into('!I', response, 36, 0)

    # Transmit Timestamp
    struct.pack_into('!I', response, 40, transmit_time)
    struct.pack_into('!I', response, 44, 0)

    sock.sendto(response, addr)
    print(f"Sent mock time {datetime.utcnow()} + {MOCK_UTC_OFFSET}h to {addr}")



def run_ntp_server():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind(('0.0.0.0', NTP_PORT))
    print(f"Mock NTP server running on UDP/{NTP_PORT}...")

    while True:
        checkNtpCalls(sock)



if __name__ == '__main__':
    run_ntp_server()
