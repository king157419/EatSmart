interface WelcomeScreenProps {
  onQuickAction: (text: string) => void;
  onLoadRecipe: () => void;
  onLoadFoodOptions: () => void;
}

export default function WelcomeScreen({
  onQuickAction,
  onLoadRecipe,
  onLoadFoodOptions,
}: WelcomeScreenProps) {
  return (
    <div className="welcome">
      <div className="welcome-icon">🥗</div>
      <h2>你好呀！</h2>
      <p>
        我是你的健康管家，可以帮你记录饮食、回答健康问题、推荐食谱。
        有什么可以帮你的？
      </p>
      <div className="quick-actions">
        <button
          className="quick-action-btn"
          onClick={onLoadFoodOptions}
        >
          📝 快捷记录
        </button>
        <button
          className="quick-action-btn"
          onClick={() => onQuickAction("我今天中午吃了一碗面条和一个水煮蛋")}
        >
          💬 对话记录
        </button>
        <button
          className="quick-action-btn"
          onClick={() => onQuickAction("我能不能吃红烧肉？")}
        >
          ❓ 饮食咨询
        </button>
        <button
          className="quick-action-btn"
          onClick={() => onQuickAction("今天散步了30分钟")}
        >
          🏃 记录运动
        </button>
        <button className="quick-action-btn" onClick={onLoadRecipe}>
          🍱 AI 食谱
        </button>
      </div>
    </div>
  );
}
