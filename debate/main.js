// main.js
$(document).ready(function () {
    const openai = new OpenAI();
    $("#chat-area").hide();

    $('#submitTopic').on('click', async function () {
        const topic = $('#debateTopic').val();
		$("#conversation-area").empty();
        const moderator = new Moderator(openai);
        moderator.showMessage(moderator.role, "请稍候，我需要判断一下这个辩论题目是否合适。");
        const debateValid = await moderator.startDebate(topic);

        if (debateValid) {
            await moderator.debate();
        } else {
            console.log('辩论题目不合适。');
        }
    });
});
