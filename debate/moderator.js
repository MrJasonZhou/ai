class Moderator {
    constructor(openai) {
        this.openai = openai;
        this.role = "主持人";
        this.procTime = 0;
        this.conTime = 0;
    }

    
    setStatus(text) {
        $("#statusText").text(text + " 消费总token数：" + this.openai.tokenCount);
    }
    
    tell(player, text) {
		player.messages.push({ role: 'system', content: text });	
	}

    showMessage(role, message) {
      const roleMap = {
        "主持人": "moderator",
        "正方": "proPlayer",
        "反方": "conPlayer"
      };
      const dataRole = roleMap[role] || ""; // 如果找不到对应的值，使用空字符串作为默认值
      $("#chat-area").show();
      $('#conversation-area').append(`
          <div class="message-row" data-role="${dataRole}">
              <div class="message-role">${role}：</div>
              <div class="message-content">${message.replace(/\n/g, '<br>')}</div>
          </div>
      `);
    }

    async startDebate(topic) {
        this.topic = topic;
       
        this.setStatus(this.role + "正在思考....");
        const responseObj = await this.openai.callAPI([
            {
                role: "system",
                content: "你是一个辩论专家，现在要进行辩论赛，需要你给出意见。"
            },
            {
                role: "user",
			    content: `辩论题目为"${topic}"，请问您是否认为这个辩题适合辩论赛？
			    考虑因素包括作为辩论赛题目的有意义性，可辩性，易理解性，挑战性以及平衡性。
			    请回答以下问题，以下列格式每行只回答具体内容，不要包含其他字符或标点：
					第1行.合适 或 不合适
					第2行.如果合适，请简洁地提供根据辩论赛题目提炼出的正方的论点本身（不要标识属于谁的论点）；如果不合适，请提供不合适的理由。
					第3行.如果合适，请简洁地提供根据辩论赛题目提炼出的反方的论点本身（不要标识属于谁的论点）；如果不合适，空行。
					第4行.如果合适，请简单地表示你对此次辩论正反双方的期待。如果不合适，空行。
					注意，合适的时候，确保你提供的正反双方论点对立并且互相否定。`
            }
        ]);

        const response = responseObj.content;
        const lines = response.split('\n');
        if (lines[0] === '不合适') {
            this.showMessage('主持人', lines[1]);
            this.setStatus(this.role + "思考完毕。");
            return false;
        } else {
            this.showMessage('主持人', `辩论题目：${topic}`);
            this.proTopic = lines[1];
            this.conTopic = lines[2];
            this.wish = lines[3];
            //正方
	        this.proPlayer = new Player(this.openai, this, "正方", this.topic, this.proTopic);
	        //反方
	        this.conPlayer = new Player(this.openai, this, "反方", this.topic, this.conTopic);
	        // 正方的对手是反方，反方的对手是正方。
	        this.proPlayer.setOpponent(this.conPlayer);
	        this.conPlayer.setOpponent(this.proPlayer);
			//告诉正方
			this.tell(this.proPlayer, `现在进行辩论赛，辩论的题目是"${topic}", 你要严格认知到自己是正方。牢记你的论点是：“${this.proTopic}”。
				你之后所有的发言都是为了证明自己是正确的，对手是错误的。`);	
			//告诉反方
			this.tell(this.conPlayer, `现在进行辩论赛，辩论的题目是"${topic}", 你要严格认知到自己是反方。牢记你的论点是：“${this.conTopic}”。
				你之后所有的发言都是为了证明自己是正确的，对手是错误的。`);	
	        //正反双方打招呼
	        //this.proPlayer.tell(this.conPlayer, `你好，我是本次辩论的正方，我的论点是"${this.proTopic}"`);
	        //this.conPlayer.tell(this.proPlayer, `你好，我是本次辩论的反方，我的论点是"${this.conTopic}"`);
	        
            this.showMessage('主持人', `正方：${this.proTopic}\n反方：${this.conTopic}\n${this.wish}`);
            return true;
        }
    }

    async debate() {
        this.showMessage('主持人', '开始导论，由正方先发言。');
		//告诉正方
		this.tell(this.proPlayer, `现在你先提出导论，说明自己的观点，并给出一些证据证明之。`);
        await this.proPlayer.ask();
        //告诉反方
		this.tell(this.conPlayer, `正方已经先提出导论，你可以有针对性地说明自己的观点，并给出一些证据证明之。`);
        await this.conPlayer.ask();
        
        this.showMessage('主持人', '开始交叉辩论，正方先发言');
		this.tell(this.proPlayer, `开始交叉辩论，你可以针对对方的发言进行质疑和反问。也可以回应对方的质疑。`);
		this.tell(this.conPlayer, `开始交叉辩论，你可以针对对方的发言进行质疑和反问。也可以回应对方的质疑。`);

        for (let i = 0; i < 2; i++) {
            await this.proPlayer.ask();
            await this.conPlayer.ask();
        }
        this.showMessage('主持人', '开始进入结论阶段，反方先发言。');
		this.tell(this.proPlayer, `现在是结论阶段，双方请总结自己的发言并试图最后证明自己的论点是正确的。`);
		this.tell(this.conPlayer, `现在是结论阶段，双方请总结自己的发言并试图最后证明自己的论点是正确的。`);
        await this.conPlayer.ask();
        await this.proPlayer.ask();
        this.showMessage('主持人', '本次辩论结束，欢迎您的观看。');
        this.setStatus("");
    }
}