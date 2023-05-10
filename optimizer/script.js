$(document).ready(() => {
  const openai = new OpenAI();
  const optimizer = new Optimizer(openai);

  $("#roleOptimizeBtn").click(async () => {
    const roleInput = $("#roleInput").val();
    const optimizedRole = await optimizer.optimizeRole(roleInput);
    $("#messageList").append(`<li class="list-group-item"><strong>AI：</strong>${optimizedRole}</li>`);
    $("#requirementSection").removeClass("d-none");
  });

  $("#requirementOptimizeBtn").click(async () => {
    const requirementInput = $("#requirementInput").val();
    const response = await optimizer.execute(requirementInput);
    $("#messageList").append(`<li class="list-group-item"><strong>你：</strong>${requirementInput}</li>`);
    $("#messageList").append(`<li class="list-group-item"><strong>AI：</strong>${response}</li>`);
  });
});
