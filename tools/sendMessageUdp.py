import socket
import json

# Create the data to send as a Python dictionary
data = {
    "message": "Best leuk he !",
    "urgent": True,
    "numRepeats": 1
}

# Convert the data to JSON format
json_data = json.dumps(data)

# Set up UDP socket
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

# Define the server address and port
server_address = ('192.168.0.160', 444)

try:
    # Send JSON data as bytes
    sock.sendto(json_data.encode(), server_address)
    print("Data sent!")
finally:
    # Close the socket
    sock.close()