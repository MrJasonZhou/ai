class Optimizer {
  constructor(openai) {
    this.openai = openai;
    this.messages = [];
  }

  async optimizeRole(role) {
    const prompt = `优化角色设定：${role}\n`;
    const response = await this.openai.callAPI([{ role: "system", content: prompt }]);
    const optimizedRole = response.content.trim();
    this.messages.push({ role: "system", content: optimizedRole });
    return optimizedRole;
  }

  async optimizeRequirement(requirement) {
    const prompt = `优化用户需求：${requirement}\n`;
    const response = await this.openai.callAPI([{ role: "user", content: prompt }]);
    const optimizedRequirement = response.content.trim();
    this.messages.push({ role: "user", content: optimizedRequirement });
    return optimizedRequirement;
  }

  async execute(requirement) {
    const optimizedRequirement = await this.optimizeRequirement(requirement);
    const response = await this.openai.callAPI(this.messages);
    const content = response.content.trim();
    this.messages.push({ role: "assistant", content: content });
    return content;
  }
}
