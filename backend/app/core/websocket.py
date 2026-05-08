"""
Food Hunger App — WebSocket Manager
Handles real-time notifications for connected users.
"""

from typing import Dict
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        # Maps user_id to their active WebSocket connection
        self.active_connections: Dict[int, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: int):
        if user_id in self.active_connections:
            del self.active_connections[user_id]

    async def send_personal_message(self, message: str, user_id: int):
        """Send a string message to a specific user if they are connected."""
        websocket = self.active_connections.get(user_id)
        if websocket:
            await websocket.send_text(message)

    async def send_personal_json(self, data: dict, user_id: int):
        """Send a JSON payload to a specific user if they are connected."""
        websocket = self.active_connections.get(user_id)
        if websocket:
            await websocket.send_json(data)

    async def broadcast(self, message: str):
        """Send a string message to all connected users."""
        for connection in self.active_connections.values():
            await connection.send_text(message)

    async def broadcast_json(self, data: dict):
        """Send a JSON payload to all connected users."""
        for connection in self.active_connections.values():
            await connection.send_json(data)


# Global instance
manager = ConnectionManager()
