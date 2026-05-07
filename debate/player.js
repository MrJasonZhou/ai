class Player {
    constructor(openai, moderator, role, topic, position) {
        this.openai = openai;
        this.moderator = moderator;
        this.role = role;
        this.topic = topic;
        this.position = position;
        this.opponent = null;
        this.messages = [
        ];
    }

    setOpponent(opponent) {
        this.opponent = opponent;
    }

    onTold(message) {
        this.messages.push(message);
    }
    
    tell(player, text) {
		player.messages.push({ role: 'user', content: text });	
	}    

    async ask(question) {
        this.moderator.setStatus(this.role + "正在思考....");
        if (question) {
	        this.messages.push({ role: 'user', content: question });
		}
        const response = await this.openai.callAPI(this.messages);
        const answer = response.content;
        this.messages.push({ role: 'assistant', content: answer });
        this.opponent.onTold({ role: 'user', content: answer });
        this.moderator.showMessage(this.role, answer);
        return response;
    }
}
