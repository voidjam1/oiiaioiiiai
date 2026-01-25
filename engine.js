class GameEngine {
    constructor(board) {
        this.board = board;
        this.isDrawer = false; // 我是画画的人吗？
        this.currentWord = ""; 
        this.roundCount = 0;   // 回合计数器
        this.timer = null;
        
        // 绑定UI
        this.ui = {
            word: document.getElementById('word-display'),
            timer: document.getElementById('timer'),
            btn: document.getElementById('start-btn'), // 只有房主能看见/点击这个
            theme: document.getElementById('theme-select')
        };
        
        // 加载词库（仅房主需要，但初始化都加载防止报错）
        this.db = JSON.parse(localStorage.getItem('drawGuessDB')) || [];
        this.initThemeUI();
    }

    initThemeUI() {
        if(this.db.length) {
            this.ui.theme.innerHTML = this.db.map((t, i) => `<option value="${i}">${t.title}</option>`).join('');
        }
    }

    // --- 房主专用：发起新回合 ---
    startNewRound() {
        if (!network.isHost) return; // 客人不能点开始

        this.roundCount++;
        const themeIdx = this.ui.theme.value;
        const words = this.db[themeIdx]?.words || ["苹果", "香蕉", "猫"]; // 兜底
        const newWord = words[Math.floor(Math.random() * words.length)];

        // 判断这一局谁画？(奇数局房主画，偶数局客人画)
        const isHostDrawing = (this.roundCount % 2 !== 0);

        // 1. 设置房主自己的状态
        this.setupRoundLocal(newWord, isHostDrawing);

        // 2. 告诉客人该干嘛
        network.send({
            cat: 'game',
            type: 'newRound',
            word: newWord,        // 把题目发过去（如果是客人画，他需要知道）
            drawer: isHostDrawing ? 'host' : 'guest'
        });
    }

    // --- 通用：接收回合设置 ---
    // data = { word: "...", drawer: "host"|"guest" }
    handleNewRound(data) {
        const amIDrawing = (network.isHost && data.drawer === 'host') || 
                           (!network.isHost && data.drawer === 'guest');
        
        this.setupRoundLocal(data.word, amIDrawing);
    }

    setupRoundLocal(word, isDrawer) {
        this.currentWord = word;
        this.isDrawer = isDrawer;
        this.board.clear();
        this.board.setLock(!isDrawer); // 如果不是我画，就锁住画布
        
        // UI 状态切换
        if (isDrawer) {
            this.ui.word.innerText = `题目: ${word}`;
            this.ui.word.style.color = '#e74c3c';
            this.toggleTools(true); // 显示画笔工具
        } else {
            this.ui.word.innerText = `题目: ??? (${word.length}个字)`;
            this.ui.word.style.color = '#2d3436';
            this.toggleTools(false); // 隐藏画笔工具
        }

        this.startTimer(60);
        this.appendMsg('system', `🎮 第 ${this.roundCount || 1} 局开始！`, 'blue');
    }

    // --- 倒计时逻辑 ---
    startTimer(sec) {
        clearInterval(this.timer);
        let t = sec;
        this.ui.timer.innerText = t;
        
        // 只有房主负责倒计时心跳，并广播给客人
        if (network.isHost) {
            this.timer = setInterval(() => {
                t--;
                network.send({ cat: 'game', type: 'tick', time: t }); // 广播时间
                this.updateTimerUI(t);

                if (t <= 0) {
                    this.handleGameOver(false); // 超时
                    network.send({ cat: 'game', type: 'timeout', ans: this.currentWord });
                }
            }, 1000);
        }
    }

    updateTimerUI(t) {
        this.ui.timer.innerText = `⏱️ ${t}`;
        if (t < 10) this.ui.timer.style.color = 'red';
        else this.ui.timer.style.color = 'black';
    }

    // --- 猜词与发送 ---
    send(type) {
        const input = document.getElementById(type + '-input');
        const val = input.value.trim();
        if (!val) return;

        // 1. 如果我是画画的人，我不能猜词！(防止作弊/误操作)
        if (this.isDrawer && type === 'guess') {
            alert("你负责画画，不能猜！");
            return;
        }

        // 2. 显示自己的消息
        this.appendMsg(type, '我', val);
        
        // 3. 发送给对方
        network.send({ cat: 'chat', type: type, msg: val });

        // 4. 本地判断（如果我是猜词的人）
        if (!this.isDrawer && type === 'guess') {
            if (val === this.currentWord) {
                // 我猜对了！通知房主结束游戏
                // 注意：为了安全，通常由房主判定，但为了响应速度，这里采用“双端判定”
                network.send({ cat: 'game', type: 'correct', winner: network.myId });
                this.handleGameOver(true, '我');
            }
        }
        
        input.value = '';
    }

    // --- 游戏结束处理 ---
    handleGameOver(win, winnerName) {
        clearInterval(this.timer);
        this.board.setLock(true); // 全员封笔
        
        if (win) {
            this.appendMsg('system', `🎉 哇！${winnerName} 猜对了！答案是 [${this.currentWord}]`, 'green');
        } else {
            this.appendMsg('system', `⌛ 时间到... 答案是 [${this.currentWord}]`, 'gray');
        }

        // 只有房主能看到“下一局”按钮
        if (network.isHost) {
            setTimeout(() => {
                 // 自动准备下一局，或者让房主点按钮
                 // this.startNewRound(); 
                 alert("本局结束，请点击开始进行下一轮");
            }, 1000);
        }
    }

    // 辅助工具：显隐画笔栏
    toggleTools(show) {
        const tools = document.getElementById('painter-tools');
        tools.style.display = show ? 'flex' : 'none';
    }

    appendMsg(type, user, text, color) {
        // ... (保持原样) ...
        const listId = type === 'chat' ? 'chat-list' : 'guess-list';
        const el = document.getElementById(listId);
        const div = document.createElement('div');
        div.style.color = color || 'inherit';
        div.innerHTML = `<strong>${user}:</strong> ${text}`;
        el.appendChild(div);
        el.scrollTop = el.scrollHeight;
    }
}
