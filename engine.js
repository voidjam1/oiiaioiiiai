class GameEngine {
    constructor(board) {
        this.board = board;
        this.timer = null;
        this.timeLeft = 60;
        this.isGameActive = false;
        this.currentWord = "";
        this.db = [];
        
        // 绑定UI元素
        this.ui = {
            word: document.getElementById('word-display'),
            timer: document.getElementById('timer'),
            btn: document.getElementById('start-btn'),
            theme: document.getElementById('theme-select')
        };

        this.loadDB();
    }

    // 1. 读取词库
    loadDB() {
        const data = localStorage.getItem('drawGuessDB');
        if (data) {
            this.db = JSON.parse(data);
            // 填充下拉菜单
            this.ui.theme.innerHTML = this.db.map((t, i) => 
                `<option value="${i}">${t.title} (${t.words.length}词)</option>`
            ).join('');
        } else {
            alert("词库为空！请先去 word.html 添加题目！");
        }
    }

    // 2. 游戏开始循环
    startGame() {
        if (this.isGameActive) return; // 防止重复点击
        
        // 检查词库
        const themeIdx = this.ui.theme.value;
        if (!this.db[themeIdx] || this.db[themeIdx].words.length === 0) {
            return alert("选中的主题没有词，快去添加！");
        }

        // 状态重置
        this.isGameActive = true;
        this.board.clear();
        this.board.setLock(false); // 解锁画布
        this.timeLeft = 60; // 设定一局60秒
        this.ui.btn.disabled = true;
        this.ui.btn.innerText = "作画中...";
        
        // 随机抽题
        const words = this.db[themeIdx].words;
        this.currentWord = words[Math.floor(Math.random() * words.length)];
        
        // 【重要】仅作画者可见题目 (这里我们模拟你是作画者)
        this.ui.word.innerText = `题目: ${this.currentWord}`;
        this.appendMsg('system', '🎮 游戏开始！请画出题目！', 'blue');

        // 启动倒计时
        this.timer = setInterval(() => this.tick(), 1000);
    }

    // 3. 时间心跳
    tick() {
        this.timeLeft--;
        this.ui.timer.innerText = `⏱️ 00:${this.timeLeft.toString().padStart(2, '0')}`;
        
        // 时间颜色预警
        if(this.timeLeft <= 10) this.ui.timer.style.color = 'red';
        else this.ui.timer.style.color = 'black';

        if (this.timeLeft <= 0) {
            this.endGame(false); // 时间到，失败
        }
    }

    // 4. 处理猜词 (核心逻辑调整)
    send(type) {
        // 如果游戏没开始，或者已经结束，禁止发送猜词
        if (!this.isGameActive && type === 'guess') {
            return alert("游戏尚未开始或已结束！");
        }

        const input = document.getElementById(type + '-input');
        const val = input.value.trim();
        if (!val) return;

        if (type === 'guess') {
            // 只有在游戏进行中才判断答案
            if (val === this.currentWord) {
                this.endGame(true, val); // 猜中了！
            } else {
                this.appendMsg('guess', '🤔 某人', val); // 错误答案公开显示
            }
        } else {
            this.appendMsg('chat', '我', val);
        }
        input.value = '';
    }

    // 5. 游戏结束
    endGame(isWin, answer) {
        clearInterval(this.timer);
        this.isGameActive = false;
        this.board.setLock(true); // 锁定画布
        this.ui.btn.disabled = false;
        this.ui.btn.innerText = "开始新一局";
        this.ui.word.innerText = "等待开始...";

        if (isWin) {
            this.appendMsg('system', `🎉 恭喜！答案正是「${answer}」！`, 'green');
            // 播放个简单的音效（可选）
            // new Audio('win.mp3').play();
        } else {
            this.appendMsg('system', `⌛ 时间到！正确答案是：${this.currentWord}`, 'red');
        }
    }

    // 辅助：消息上屏
    appendMsg(type, user, text, color) {
        const listId = type === 'chat' ? 'chat-list' : 'guess-list';
        const list = document.getElementById(listId);
        const div = document.createElement('div');
        div.style.marginBottom = "5px";
        if (color) div.style.color = color;
        
        if (type === 'system') {
            div.style.textAlign = 'center';
            div.style.background = '#eee';
            div.style.borderRadius = '5px';
            div.style.fontSize = '12px';
            div.innerHTML = text;
        } else {
            div.innerHTML = `<strong>${user}:</strong> ${text}`;
        }
        
        list.appendChild(div);
        list.scrollTop = list.scrollHeight;
    }
}
