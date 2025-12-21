import socket
from datetime import datetime

listenPort = 445

def hexString2Integers(data):
    hex_string = data.lstrip('@')
    if len(hex_string) % 2 != 0:
        raise ValueError("Hex string length should be a multiple of 2.")
    chunks = [hex_string[i:i+2] for i in range(0, len(hex_string), 2)]
    integers = [int(chunk, 16) for chunk in chunks]
    return integers

def byte_to_custom_str(byte):
    if not (0 <= byte <= 255):
        raise ValueError("Input must be an integer between 0 and 255")
    
    # Convert the byte to a binary string
    binary_str = format(byte, '08b')  # Format as an 8-bit binary string
    
    # Replace '0' with ' ' and '1' with '*'
    custom_str = ''.join('*' if bit == '1' else ' ' for bit in binary_str)
    
    return custom_str

def main():
    # Create a UDP socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

    # Set socket options to allow multiple sockets to use the same PORT number
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)

    # Bind the socket to the port
    
    server_address = ('', listenPort)  # '' means all available interfaces
    sock.bind(server_address)

    print(f"Listening for UDP messages on port {listenPort}...")

    while True:
        data, (address, port) = sock.recvfrom(4096)  # Buffer size is 4096 bytes
        dataString = data.decode('utf-8')
        if dataString.startswith("@"):
            integers = hexString2Integers(dataString)
            print("+--------------------------------+")
            for digit in range(8):
                print("|", end="")
                for display in range(3,-1,-1):
                    print (byte_to_custom_str(integers[display*8+digit]), end="")
                print("|")
            print("+--------------------------------+")
            

        #print(f"Received {len(data)} bytes from {address}: {dataString}")
        print(f"{datetime.now().strftime("%H:%M:%S")} {address}: {dataString}")

if __name__ == "__main__":
    main()
 