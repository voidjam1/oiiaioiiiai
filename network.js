class NetworkManager {
    constructor() {
        this.client = null;
        this.roomID = null;
        this.isHost = false;
        this.myNickname = "玩家";
    }

    getNickname() {
        return document.getElementById('my-nickname').value.trim() || (this.isHost ? "房主" : "朋友");
    }

    connectToCloud(roomId, isHost) {
        this.isHost = isHost;
        this.roomID = roomId;
        this.myNickname = this.getNickname();
        engine.setSelfName(this.myNickname);

        const options = {
            clean: true,
            connectTimeout: 5000, // 跨国连接给5秒耐心
            keepalive: 30,        // 30秒心跳，防止跨海光缆链路空置被切断
            reconnectPeriod: 1000, // 断线后每秒重试一次
            clientId: 'gartic_' + Math.random().toString(16).substr(2, 8),
        };

        // 端口 8084 是 WSS 加密端口，对绕过某些网络限制非常有效
        this.client = mqtt.connect('wss://broker.emqx.io:8084/mqtt', options);

        this.client.on('connect', () => {
            console.log('✅ 已接入全球中转站');
            // 使用更具唯一性的主题路径
            const topic = `gartic_pro/room/${this.roomID}`;
            
            this.client.subscribe(topic, { qos: 1 }, (err) => { // qos: 1 确保消息至少到达一次
                if (!err) {
                    document.getElementById('lobby-overlay').style.display = 'none';
                    // 进屋先喊一声：我来了！
                    this.send({ cat: 'handshake', name: this.myNickname });
                    engine.appendMsg('chat-list', '系统', `已进入房间: ${this.roomID}`, 'green');
                }
            });
        });

        this.client.on('message', (topic, payload) => {
            let data;
            try {
                data = JSON.parse(payload.toString());
            } catch (e) { return; }

            // 核心过滤：不处理自己发的消息
            if (data._from === this.client.options.clientId) return;

            if (data.cat === 'handshake') {
                engine.setOpponentName(data.name);
                engine.appendMsg('chat-list', '系统', `👋 玩家【${data.name}】进入了房间`, '#6c5ce7');
                
                // 关键点：如果是别人新进来的，我要告诉他我也在
                // 这样无论谁先谁后进，最终双方都能获取彼此的名字
                if (data.isFirstHello) { 
                    this.send({ cat: 'handshake', name: this.myNickname, isFirstHello: false });
                }
                
                engine.onPlayerJoined(this.isHost);
            } else {
                engine.handlePacket(data);
            }
        });

        this.client.on('close', () => {
            console.log('🚫 掉线重连中...');
        });
    }

    createRoom() {
        const randomID = Math.floor(100000 + Math.random() * 900000).toString();
        document.getElementById('lobby-btns').style.display = 'none';
        document.getElementById('room-info-display').style.display = 'block';
        document.getElementById('my-room-id').innerText = randomID;
        this.connectToCloud(randomID, true);
    }

    joinRoom() {
        const id = document.getElementById('target-id').value.trim();
        if (!id) return alert("请输入房号");
        this.connectToCloud(id, false);
    }

    send(data) {
        if (this.client && this.client.connected) {
            // 默认带上初次招呼标记，方便对方回礼
            if (data.cat === 'handshake' && data.isFirstHello === undefined) {
                data.isFirstHello = true;
            }
            data._from = this.client.options.clientId;
            const topic = `gartic_pro/room/${this.roomID}`;
            // 聊天和猜题用 qos: 1 (保证到达)，画画用 qos: 0 (追求速度)
            const qos = data.cat === 'paint' ? 0 : 1;
            this.client.publish(topic, JSON.stringify(data), { qos });
        }
    }
}

const network = new NetworkManager();
