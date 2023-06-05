import asyncio
import socket
import logging

# 代理服务器参数
PROXY_SERVER_IP = 'your_proxy_server_ip'
PROXY_SERVER_PORT = 8080  # 你的代理服务器端口

# 本地监听参数
LOCAL_IP = '127.0.0.1'
LOCAL_PORT = 1080

# 要替换的目标
TARGET_HOST = 'chat.openai.com'
TARGET_PORT = 443

# 替换后的目标
NEW_HOST = '104.18.3.161'
NEW_PORT = 443

# 设置日志
logging.basicConfig(level=logging.INFO)

class ProxyServerProtocol(asyncio.Protocol):
    def __init__(self):
        self.transport = None
        self.proxy_transport = None
        self.buffer = b''

    def connection_made(self, transport):
        self.transport = transport

    def data_received(self, data):
        self.buffer += data
        if b'\r\n\r\n' in self.buffer:
            data, self.buffer = self.buffer.split(b'\r\n\r\n', 1)
            data += b'\r\n\r\n'
            message = data.decode()
            if 'CONNECT' in message.split(' ')[0]:
                logging.info(f'Received request: {message.splitlines()[0]}')
                if f'CONNECT {TARGET_HOST}:{TARGET_PORT}' in message:
                    message = message.replace(f'{TARGET_HOST}:{TARGET_PORT}', f'{NEW_HOST}:{NEW_PORT}')
                    data = message.encode()

            loop = asyncio.get_event_loop()
            coro = loop.create_connection(lambda: ProxyClientProtocol(self.transport), PROXY_SERVER_IP, PROXY_SERVER_PORT)
            task = asyncio.ensure_future(coro)
            task.add_done_callback(lambda future: self.data_received_callback(future, data))

    def data_received_callback(self, future, data):
        _, protocol = future.result()
        self.proxy_transport = protocol.transport
        self.proxy_transport.write(data)
        if self.buffer:
            self.proxy_transport.write(self.buffer)
            self.buffer = b''

    def connection_lost(self, exc):
        if self.proxy_transport is not None:
            self.proxy_transport.close()

class ProxyClientProtocol(asyncio.Protocol):
    def __init__(self, transport):
        self.transport = transport
        self.buffer = b''

    def data_received(self, data):
        self.buffer += data
        if self.buffer:
            self.transport.write(self.buffer)
            self.buffer = b''

    def connection_lost(self, exc):
        self.transport.close()

loop = asyncio.get_event_loop()
coro = loop.create_server(ProxyServerProtocol, LOCAL_IP, LOCAL_PORT)
server = loop.run_until_complete(coro)

try:
    loop.run_forever()
except KeyboardInterrupt:
    pass

server.close()
loop.run_until_complete(server.wait_closed())
loop.close()
