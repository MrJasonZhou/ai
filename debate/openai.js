class OpenAI {
    constructor() {
        this.API_URL = 'https://api.openai.com/v1/chat/completions';
        this.API_KEY = localStorage.getItem('api_key');
		this.model = 'gpt-3.5-turbo';
        this.tokenCount = 0;
    }

    // log 方法，用于输出日志信息
	log(message, object = null) {
	    if (object) {
	        console.log(`[OpenAI] ${message}`, JSON.stringify(object, null, 2));
	    } else {
	        console.log(`[OpenAI] ${message}`);
	    }
	}
    // 删除多余空行的方法
    removeExtraEmptyLines(text) {
        return text.replace(/\n{2,}/g, '\n');
    }

    async callAPI(messages) {
        if (!this.API_KEY) {
            this.API_KEY = prompt('请输入API Key：');
            if (!this.API_KEY) {
                throw new Error('未输入API Key。');
            }
            localStorage.setItem('api_key', this.API_KEY);
        }

        const requestBody = {
            model: this.model,
            messages: messages
        };

        // 在调用 API 之前，输出请求信息
        this.log(`正在调用 API，请求内容: `, requestBody);

        try {
            const start = performance.now();
            const response = await fetch(this.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.API_KEY}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem('api_key');
                }

                const errorData = await response.json();
                // 输出详细的错误信息
                this.log(`API 调用失败，错误信息: `, errorData);
                throw new Error('API调用失败。');
            }

            const data = await response.json();
            const end = performance.now();

            // 在收到 API 响应后，输出详细回答信息
            this.log(`API 调用成功，详细回答信息: `, data.choices[0].message);

            // 预处理回答内容，移除多余空行
            const processedContent = this.removeExtraEmptyLines(data.choices[0].message.content);

            // 累加 token 数量
            this.tokenCount += data.usage.total_tokens;
            this.log(`当前会话总 token 数量: ${this.tokenCount}`);

            return {
                content: processedContent.trim(),
                time: end - start,
                token: data.usage.total_tokens
            };
        } catch (error) {
            console.error(error);
            throw error;
        }
    }
}
